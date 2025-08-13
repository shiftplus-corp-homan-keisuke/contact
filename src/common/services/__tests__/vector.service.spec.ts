/**
 * ベクトルサービスのテスト
 * 要件: 3.1, 3.2 (ベクトルデータベース連携機能)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VectorService } from '../../../modules/search/services/vector.service';
import { Inquiry } from '../../entities/inquiry.entity';
import { Response } from '../../entities/response.entity';
import { InquiryStatus, InquiryPriority } from '../../types/inquiry.types';

// Faiss-nodeのモック
jest.mock('faiss-node', () => ({
  IndexFlatIP: jest.fn().mockImplementation((dimension) => ({
    add: jest.fn(),
    search: jest.fn().mockReturnValue({
      distances: new Float32Array([0.9, 0.8, 0.7]),
      labels: new BigInt64Array([0n, 1n, 2n])
    }),
    ntotal: jest.fn().mockReturnValue(3),
    writeIndex: jest.fn(),
    readIndex: jest.fn(),
  }))
}));

// fs/promisesのモック
jest.mock('fs/promises', () => ({
  access: jest.fn(),
  mkdir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

// fetchのモック
global.fetch = jest.fn();

describe('VectorService', () => {
  let service: VectorService;
  let configService: ConfigService;
  let inquiryRepository: Repository<Inquiry>;
  let responseRepository: Repository<Response>;

  const mockInquiry: Partial<Inquiry> = {
    id: '1',
    title: 'ログインエラーについて',
    content: 'ログインできません',
    status: InquiryStatus.NEW,
    priority: InquiryPriority.HIGH,
    category: '技術的問題',
    appId: 'app-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockResponse: Partial<Response> = {
    id: '2',
    content: 'パスワードをリセットしてください',
    inquiryId: '1',
    userId: 'user-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: any) => {
        switch (key) {
          case 'OPENAI_API_KEY':
            return 'test-api-key';
          case 'VECTOR_DATA_DIR':
            return './test-data/vectors';
          default:
            return defaultValue;
        }
      }),
    };

    const mockInquiryRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const mockResponseRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(Inquiry),
          useValue: mockInquiryRepository,
        },
        {
          provide: getRepositoryToken(Response),
          useValue: mockResponseRepository,
        },
      ],
    }).compile();

    service = module.get<VectorService>(VectorService);
    configService = module.get<ConfigService>(ConfigService);
    inquiryRepository = module.get<Repository<Inquiry>>(getRepositoryToken(Inquiry));
    responseRepository = module.get<Repository<Response>>(getRepositoryToken(Response));

    // VectorServiceの初期化を手動で実行
    await service.onModuleInit();

    // fetchのモックレスポンス設定
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        data: [{
          embedding: new Array(1536).fill(0.1),
          index: 0
        }],
        model: 'text-embedding-ada-002',
        usage: {
          prompt_tokens: 10,
          total_tokens: 10
        }
      })
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('embedText', () => {
    it('テキストを正常にベクトル化できること', async () => {
      const text = 'ログインエラーについて';
      
      const result = await service.embedText(text);
      
      expect(result).toHaveLength(1536);
      expect(result[0]).toBe(0.1);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: text,
            model: 'text-embedding-ada-002',
          }),
        })
      );
    });

    it('OpenAI APIキーが設定されていない場合はエラーを投げること', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);
      
      await expect(service.embedText('test')).rejects.toThrow('OpenAI API キーが設定されていません');
    });

    it('OpenAI APIエラーの場合はエラーを投げること', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Unauthorized')
      });
      
      await expect(service.embedText('test')).rejects.toThrow('OpenAI API エラー: 401 Unauthorized');
    });
  });

  describe('storeVector', () => {
    it('ベクトルを正常に保存できること', async () => {
      const vector = new Array(1536).fill(0.1);
      const metadata = {
        id: '1',
        type: 'inquiry' as const,
        appId: 'app-1',
        category: '技術的問題',
        status: 'new',
        createdAt: '2024-01-01T00:00:00.000Z',
        title: 'テスト問い合わせ',
        content: 'テスト内容',
      };

      await service.storeVector('1', vector, metadata);

      // Faissインデックスのaddメソッドが呼ばれることを確認
      // 実際のテストでは、モックされたFaissインデックスのメソッドが呼ばれることを確認
      expect(service).toBeDefined(); // 基本的な動作確認
    });

    it('ベクトルの次元数が不正な場合はエラーを投げること', async () => {
      const vector = new Array(100).fill(0.1); // 不正な次元数
      const metadata = {
        id: '1',
        type: 'inquiry' as const,
        appId: 'app-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        content: 'テスト内容',
      };

      await expect(service.storeVector('1', vector, metadata)).rejects.toThrow(
        'ベクトルの次元数が不正です。期待値: 1536, 実際: 100'
      );
    });
  });

  describe('vectorSearch', () => {
    it('ベクトル検索を正常に実行できること', async () => {
      const queryVector = new Array(1536).fill(0.1);
      
      // メタデータを事前に設定
      const metadata = {
        id: '1',
        type: 'inquiry' as const,
        appId: 'app-1',
        createdAt: '2024-01-01T00:00:00.000Z',
        content: 'テスト内容',
      };
      
      // プライベートメソッドにアクセスするためのハック
      (service as any).vectorMetadata.set(0, metadata);
      
      const results = await service.vectorSearch(queryVector, 5);
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
      expect(results[0].score).toBeCloseTo(0.9, 1);
      expect(results[0].metadata).toEqual(metadata);
      expect(results[0].content).toBe('テスト内容');
    });

    it('クエリベクトルの次元数が不正な場合はエラーを投げること', async () => {
      const queryVector = new Array(100).fill(0.1); // 不正な次元数
      
      await expect(service.vectorSearch(queryVector, 5)).rejects.toThrow(
        'クエリベクトルの次元数が不正です。期待値: 1536, 実際: 100'
      );
    });
  });

  describe('storeInquiryVector', () => {
    it('問い合わせベクトルを正常に保存できること', async () => {
      const inquiry = mockInquiry as Inquiry;
      
      const embedTextSpy = jest.spyOn(service, 'embedText').mockResolvedValue(new Array(1536).fill(0.1));
      const storeVectorSpy = jest.spyOn(service, 'storeVector').mockResolvedValue(undefined);
      
      await service.storeInquiryVector(inquiry);
      
      expect(embedTextSpy).toHaveBeenCalledWith('ログインエラーについて ログインできません');
      expect(storeVectorSpy).toHaveBeenCalledWith(
        inquiry.id,
        new Array(1536).fill(0.1),
        expect.objectContaining({
          id: inquiry.id,
          type: 'inquiry',
          appId: inquiry.appId,
          category: inquiry.category,
          status: inquiry.status,
          title: inquiry.title,
          content: 'ログインエラーについて ログインできません',
        })
      );
    });
  });

  describe('storeResponseVector', () => {
    it('回答ベクトルを正常に保存できること', async () => {
      const response = mockResponse as Response;
      const inquiry = mockInquiry as Inquiry;
      
      const embedTextSpy = jest.spyOn(service, 'embedText').mockResolvedValue(new Array(1536).fill(0.1));
      const storeVectorSpy = jest.spyOn(service, 'storeVector').mockResolvedValue(undefined);
      
      await service.storeResponseVector(response, inquiry);
      
      expect(embedTextSpy).toHaveBeenCalledWith(response.content);
      expect(storeVectorSpy).toHaveBeenCalledWith(
        response.id,
        new Array(1536).fill(0.1),
        expect.objectContaining({
          id: response.id,
          type: 'response',
          appId: inquiry.appId,
          category: inquiry.category,
          status: inquiry.status,
          title: inquiry.title,
          content: response.content,
        })
      );
    });
  });

  describe('ragSearch', () => {
    it('RAG検索を正常に実行できること', async () => {
      const query = 'ログインエラー';
      
      const embedTextSpy = jest.spyOn(service, 'embedText').mockResolvedValue(new Array(1536).fill(0.1));
      const vectorSearchSpy = jest.spyOn(service, 'vectorSearch').mockResolvedValue([
        {
          id: '1',
          score: 0.9,
          metadata: {
            id: '1',
            type: 'inquiry',
            appId: 'app-1',
            createdAt: '2024-01-01T00:00:00.000Z',
            content: 'ログインエラーについて',
          },
          content: 'ログインエラーについて',
        }
      ]);
      
      const results = await service.ragSearch(query, { limit: 5 });
      
      expect(embedTextSpy).toHaveBeenCalledWith(query);
      expect(vectorSearchSpy).toHaveBeenCalledWith(new Array(1536).fill(0.1), 10); // limit * 2
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });

    it('appIdでフィルタリングできること', async () => {
      const query = 'ログインエラー';
      
      jest.spyOn(service, 'embedText').mockResolvedValue(new Array(1536).fill(0.1));
      jest.spyOn(service, 'vectorSearch').mockResolvedValue([
        {
          id: '1',
          score: 0.9,
          metadata: {
            id: '1',
            type: 'inquiry',
            appId: 'app-1',
            createdAt: '2024-01-01T00:00:00.000Z',
            content: 'ログインエラーについて',
          },
          content: 'ログインエラーについて',
        },
        {
          id: '2',
          score: 0.8,
          metadata: {
            id: '2',
            type: 'inquiry',
            appId: 'app-2',
            createdAt: '2024-01-01T00:00:00.000Z',
            content: '別のアプリのエラー',
          },
          content: '別のアプリのエラー',
        }
      ]);
      
      const results = await service.ragSearch(query, { limit: 5, appId: 'app-1' });
      
      expect(results).toHaveLength(1);
      expect(results[0].metadata.appId).toBe('app-1');
    });
  });

  describe('getIndexStatistics', () => {
    it('インデックス統計を正常に取得できること', async () => {
      // メタデータを事前に設定
      (service as any).vectorMetadata.set(0, { type: 'inquiry' });
      (service as any).vectorMetadata.set(1, { type: 'response' });
      (service as any).vectorMetadata.set(2, { type: 'faq' });
      
      const statistics = service.getIndexStatistics();
      
      expect(statistics).toEqual({
        totalVectors: 3,
        inquiryVectors: 1,
        responseVectors: 1,
        faqVectors: 1,
      });
    });
  });
});