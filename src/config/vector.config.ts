import { registerAs } from '@nestjs/config';

export default registerAs('vector', () => ({
    faiss: {
        indexPath: process.env.FAISS_INDEX_PATH || './data/faiss_index',
        dimension: parseInt(process.env.VECTOR_DIMENSION, 10) || 1536, // OpenAI text-embedding-3-small
        indexType: process.env.FAISS_INDEX_TYPE || 'IndexFlatIP', // Inner Product for cosine similarity
        metricType: process.env.FAISS_METRIC_TYPE || 'METRIC_INNER_PRODUCT',
        nlist: parseInt(process.env.FAISS_NLIST, 10) || 100, // IVFインデックス用
        nprobe: parseInt(process.env.FAISS_NPROBE, 10) || 10, // 検索時のクラスタ数
    },
    search: {
        defaultLimit: parseInt(process.env.VECTOR_SEARCH_LIMIT, 10) || 10,
        similarityThreshold: parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.7,
    },
}));