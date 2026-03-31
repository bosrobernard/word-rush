import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type MatchStatus =
  | 'CREATED' | 'WAITING_FOR_PLAYERS' | 'FUNDS_LOCKED' | 'READY'
  | 'COUNTDOWN' | 'IN_PROGRESS' | 'RESULT_PENDING' | 'SETTLED'
  | 'REFUNDED' | 'CANCELED' | 'FAILED';

export interface GameMatch {
  id: string;
  roomId: string;
  gameKey: string;
  status: MatchStatus;
  entryAmount: number;
  currency: string;
  expectedPlayers: number;
  feePercent?: number;
  seatToken?: string;
  seatNo?: number;
  customerId?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

export interface MatchPlayer {
  customerId: string;
  nickname: string;
  seatNo: number;
  status: string;
  score?: number;
  rank?: number;
  [key: string]: any;
}

export interface MyMatchesParams {
  page?: number;
  limit?: number;
  status?: MatchStatus;
  gameKey?: string;
}

export interface MyMatchesResponse {
  data: GameMatch[];
  total?: number;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class GameMatchService {
  private readonly base = environment.apiBase;

  constructor(private http: HttpClient) {}

  // ── Auth header helper ────────────────────────────────────────────────────
  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('lb_access_token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // ── GET /game-matches/{matchId} ───────────────────────────────────────────
  getMatchById(matchId: string): Promise<GameMatch> {
    return this.http
      .get<{ data: GameMatch }>(`${this.base}/game-matches/${matchId}`, {
        headers: this.authHeaders(),
      })
      .toPromise()
      .then(res => res?.data ?? (res as any));
  }

  // ── GET /game-matches/room/{roomId} ───────────────────────────────────────
  getMatchByRoomId(roomId: string): Promise<GameMatch> {
    return this.http
      .get<{ data: GameMatch }>(`${this.base}/game-matches/room/${roomId}`, {
        headers: this.authHeaders(),
      })
      .toPromise()
      .then(res => res?.data ?? (res as any));
  }

  // ── GET /my/game-matches ──────────────────────────────────────────────────
  getMyMatches(params: MyMatchesParams = {}): Promise<MyMatchesResponse> {
    let query = new HttpParams();
    if (params.page)    query = query.set('page',    String(params.page));
    if (params.limit)   query = query.set('limit',   String(params.limit));
    if (params.status)  query = query.set('status',  params.status);
    if (params.gameKey) query = query.set('gameKey', params.gameKey);

    return this.http
      .get<MyMatchesResponse>(`${this.base}/my/game-matches`, {
        headers: this.authHeaders(),
        params:  query,
      })
      .toPromise()
      .then(res => res ?? { data: [] });
  }

  // ── GET /game-matches/{matchId}/players ───────────────────────────────────
  getMatchPlayers(matchId: string): Promise<MatchPlayer[]> {
    return this.http
      .get<{ data: MatchPlayer[] }>(`${this.base}/game-matches/${matchId}/players`, {
        headers: this.authHeaders(),
      })
      .toPromise()
      .then(res => res?.data ?? []);
  }
}
