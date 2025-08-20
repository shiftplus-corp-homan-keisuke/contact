import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FAQ, FAQSiteConfig } from './entities';
import { Inquiry, Application } from '../inquiries/entities';
import { Response } from '../responses/entities/response.entity';
import { FAQsController, FAQSiteController } from './controllers';
import { PublicFAQsController } from './controllers/public-faqs.controller';
import { FAQsService, FAQClusteringService, FAQSiteService } from './services';
import { FAQsRepository } from './repositories';
import { SearchModule } from '../search/search.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([FAQ, FAQSiteConfig, Inquiry, Response, Application]),
        SearchModule,
    ],
    controllers: [FAQsController, FAQSiteController, PublicFAQsController],
    providers: [
        FAQsService,
        FAQsRepository,
        FAQClusteringService,
        FAQSiteService,
    ],
    exports: [
        FAQsService,
        FAQsRepository,
        FAQClusteringService,
        FAQSiteService,
    ],
})
export class FAQsModule { }