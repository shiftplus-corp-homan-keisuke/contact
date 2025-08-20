import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SearchService } from './services/search.service';
import { VectorService } from './services/vector.service';
import { VectorizationService } from './services/vectorization.service';
import { HybridSearchService } from './services/hybrid-search.service';
import { Inquiry } from '../inquiries/entities/inquiry.entity';
import { Response } from '../responses/entities/response.entity';
import { FAQ } from '../faqs/entities/faq.entity';
import openaiConfig from '../../config/openai.config';
import vectorConfig from '../../config/vector.config';

@Module({
    imports: [
        TypeOrmModule.forFeature([Inquiry, Response, FAQ]),
        ConfigModule.forFeature(openaiConfig),
        ConfigModule.forFeature(vectorConfig),
    ],
    providers: [
        SearchService,
        VectorService,
        VectorizationService,
        HybridSearchService,
    ],
    exports: [
        SearchService,
        VectorService,
        VectorizationService,
        HybridSearchService,
    ],
})
export class SearchModule { }