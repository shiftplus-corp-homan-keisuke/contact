import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    JoinColumn,
    Index,
} from 'typeorm';
import { Macro } from './macro.entity';
import { User } from '../../users/entities';

/**
 * マクロ使用統計エンティティ
 * マクロの使用履歴を追跡
 */
@Entity('macro_usage')
@Index(['macroId'])
@Index(['userId'])
@Index(['usedAt'])
export class MacroUsage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'macro_id' })
    macroId: string;

    @Column({ name: 'user_id' })
    userId: string;

    @Column('jsonb', { name: 'expanded_variables', default: {} })
    expandedVariables: Record<string, string>;

    @Column({ name: 'expanded_content', type: 'text' })
    expandedContent: string;

    @CreateDateColumn({ name: 'used_at' })
    usedAt: Date;

    @ManyToOne(() => Macro)
    @JoinColumn({ name: 'macro_id' })
    macro: Macro;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;
}