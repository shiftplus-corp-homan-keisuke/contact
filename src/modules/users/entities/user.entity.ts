/**
 * ユーザーエンティティ
 * 要件: 4.1, 4.2 (ユーザー管理機能)
 */

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Role } from './role.entity';
import { Inquiry } from '../../../common/entities/inquiry.entity';
import { Response } from '../../../common/entities/response.entity';
import { UserHistory } from './user-history.entity';
import { Template } from '../../../common/entities/template.entity';
import { TemplateUsage } from '../../../common/entities/template-usage.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // リレーション
  @ManyToOne(() => Role, role => role.users)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @OneToMany(() => Inquiry, inquiry => inquiry.assignedUser)
  assignedInquiries: Inquiry[];

  @OneToMany(() => Response, response => response.user)
  responses: Response[];

  @OneToMany(() => UserHistory, history => history.user)
  history: UserHistory[];

  @OneToMany(() => UserHistory, history => history.changedByUser)
  changedHistory: UserHistory[];

  @OneToMany(() => Template, template => template.creator)
  templates: Template[];

  @OneToMany(() => TemplateUsage, usage => usage.user)
  templateUsages: TemplateUsage[];
}