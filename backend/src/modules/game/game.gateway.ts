import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/' })
export class GameGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  // in-memory timers per session
  private timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly gameService: GameService,
    private readonly jwtService: JwtService,
  ) {}

  private extractUserId(token?: string): string | null {
    if (!token) return null;
    try {
      const payload: any = this.jwtService.verify(token);
      return payload.sub ?? null;
    } catch {
      return null;
    }
  }

  private buildQuestionPayload(
    question: { id: string; text: string; type: string; timerSec: number; options: { id: string; text: string; isCorrect: boolean }[] },
    questionIndex: number,
    totalQuestions: number,
  ) {
    const now = Date.now();
    return {
      questionId: question.id,
      question: question.text,
      type: question.type,
      options: question.options.map((o) => ({ id: o.id, text: o.text })),
      timerSec: question.timerSec,
      startedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + question.timerSec * 1000).toISOString(),
      questionIndex,
      totalQuestions,
      roundName: '',
    };
  }

  // ─── HOST ────────────────────────────────────────────────────────────────

  @SubscribeMessage('join_as_host')
  async handleHostJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { code: string; token: string },
  ) {
    const userId = this.extractUserId(data.token);
    if (!userId) {
      client.emit('error', { message: 'Unauthorized' });
      return;
    }

    const result = await this.gameService.hostJoin(data.code, userId, client.id);
    if (!result.success) {
      client.emit('error', { message: result.error });
      return;
    }

    client.data.userId = userId;
    client.data.isHost = true;
    client.data.sessionCode = data.code;
    client.join(data.code);

    client.emit('host_joined', {
      sessionId: result.sessionId,
      code: data.code,
      quizTitle: result.quizTitle,
      participants: result.participants ?? [],
    });
  }

  @SubscribeMessage('start_game')
  async handleStartGame(@ConnectedSocket() client: Socket) {
    if (!client.data.isHost) {
      client.emit('error', { message: 'Not a host' });
      return;
    }
    const code = client.data.sessionCode as string;
    const result = await this.gameService.startGame(code);
    if (!result.success) {
      client.emit('error', { message: result.error });
      return;
    }

    const payload = this.buildQuestionPayload(
      result.question!,
      result.questionIndex!,
      result.totalQuestions!,
    );
    this.server.to(code).emit('question_start', payload);
    this.scheduleQuestionEnd(code, result.question!.timerSec, result.question!.id);
  }

  @SubscribeMessage('next_question')
  async handleNextQuestion(@ConnectedSocket() client: Socket) {
    if (!client.data.isHost) return;
    await this.advanceToNext(client.data.sessionCode as string);
  }

  @SubscribeMessage('end_game')
  async handleEndGame(@ConnectedSocket() client: Socket) {
    if (!client.data.isHost) return;
    await this.finishGame(client.data.sessionCode as string);
  }

  // ─── PLAYER ──────────────────────────────────────────────────────────────

  @SubscribeMessage('join_game')
  async handlePlayerJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameCode: string; displayName: string; token?: string },
  ) {
    const userId = this.extractUserId(data.token);
    const result = await this.gameService.playerJoin(
      data.gameCode,
      data.displayName,
      client.id,
      userId,
    );

    if (!result.success) {
      client.emit('error', { message: result.error });
      return;
    }

    client.data.participantId = result.participantId;
    client.data.sessionCode = data.gameCode;
    client.join(data.gameCode);

    client.emit('joined', {
      reconnectToken: result.reconnectToken,
      gameTitle: result.gameTitle,
      participantId: result.participantId,
    });

    // Notify everyone (host sees participant list update)
    this.server.to(data.gameCode).emit('participant_joined', {
      displayName: data.displayName,
      count: result.participantCount,
    });
  }

  @SubscribeMessage('submit_answer')
  async handleSubmitAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { optionIds?: string[]; selectedOptionIds?: string[]; questionId?: string },
  ) {
    const code = client.data.sessionCode as string;
    const participantId = client.data.participantId as string;
    if (!participantId || !code) return;

    const optionIds = data.optionIds ?? data.selectedOptionIds ?? [];
    const result = await this.gameService.submitAnswer(code, participantId, optionIds);

    if (result) {
      // Private feedback to player
      client.emit('answer_result', {
        isCorrect: result.isCorrect,
        scoreEarned: result.scoreEarned,
      });
    }
  }

  // ─── DISCONNECT ──────────────────────────────────────────────────────────

  async handleDisconnect(client: Socket) {
    if (client.data.isHost && client.data.sessionCode) {
      this.server
        .to(client.data.sessionCode as string)
        .emit('host_disconnected', {});
    }
  }

  // ─── INTERNAL FLOW ───────────────────────────────────────────────────────

  private scheduleQuestionEnd(code: string, timerSec: number, questionId: string) {
    this.clearTimer(`q_${code}`);
    const t = setTimeout(async () => {
      await this.emitShowAnswer(code, questionId);
    }, timerSec * 1000);
    this.timers.set(`q_${code}`, t);
  }

  private async emitShowAnswer(code: string, _questionId: string) {
    const result = this.gameService.getAnswerResult(code);
    if (!result) return;

    this.server.to(code).emit('show_answer', {
      correctOptionIds: result.correctOptionIds,
      answerCount: result.answerCount,
      participantCount: result.participantCount,
    });

    this.clearTimer(`ans_${code}`);
    const t = setTimeout(async () => {
      await this.emitShowLeaderboard(code);
    }, 5000);
    this.timers.set(`ans_${code}`, t);
  }

  private async emitShowLeaderboard(code: string) {
    const leaderboard = this.gameService.getLeaderboard(code);
    this.server.to(code).emit('show_leaderboard', { top: leaderboard });

    this.clearTimer(`lb_${code}`);
    const t = setTimeout(async () => {
      await this.advanceToNext(code);
    }, 5000);
    this.timers.set(`lb_${code}`, t);
  }

  private async advanceToNext(code: string) {
    this.clearTimer(`q_${code}`);
    this.clearTimer(`ans_${code}`);
    this.clearTimer(`lb_${code}`);

    const result = this.gameService.nextQuestion(code);
    if (!result || result.finished) {
      await this.finishGame(code);
      return;
    }

    const payload = this.buildQuestionPayload(
      result.question!,
      result.questionIndex,
      result.totalQuestions,
    );
    this.server.to(code).emit('question_start', payload);
    this.scheduleQuestionEnd(code, result.question!.timerSec, result.question!.id);
  }

  private async finishGame(code: string) {
    this.clearTimer(`q_${code}`);
    this.clearTimer(`ans_${code}`);
    this.clearTimer(`lb_${code}`);

    const leaderboard = this.gameService.getLeaderboard(code);
    await this.gameService.markFinished(code);
    this.server.to(code).emit('game_finished', { leaderboard });
  }

  private clearTimer(key: string) {
    const t = this.timers.get(key);
    if (t) clearTimeout(t);
    this.timers.delete(key);
  }
}
