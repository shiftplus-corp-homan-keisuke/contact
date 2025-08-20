import { IdGenerator } from './id-generator.util';

describe('IdGenerator', () => {
    describe('generateUuid', () => {
        it('should generate a valid UUID', () => {
            const uuid = IdGenerator.generateUuid();

            expect(uuid).toBeDefined();
            expect(typeof uuid).toBe('string');
            expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        });

        it('should generate unique UUIDs', () => {
            const uuid1 = IdGenerator.generateUuid();
            const uuid2 = IdGenerator.generateUuid();

            expect(uuid1).not.toBe(uuid2);
        });
    });

    describe('generatePrefixedId', () => {
        it('should generate ID with correct prefix', () => {
            const prefix = 'test';
            const id = IdGenerator.generatePrefixedId(prefix);

            expect(id.startsWith(`${prefix}_`)).toBe(true);
            expect(id.length).toBeGreaterThan(prefix.length + 1);
        });
    });

    describe('generateInquiryId', () => {
        it('should generate inquiry ID with correct prefix', () => {
            const id = IdGenerator.generateInquiryId();

            expect(id.startsWith('inq_')).toBe(true);
        });
    });

    describe('generateApiKey', () => {
        it('should generate API key with correct format', () => {
            const apiKey = IdGenerator.generateApiKey();

            expect(apiKey.startsWith('ak_')).toBe(true);
            expect(apiKey.split('_')).toHaveLength(3);
        });

        it('should generate unique API keys', () => {
            const key1 = IdGenerator.generateApiKey();
            const key2 = IdGenerator.generateApiKey();

            expect(key1).not.toBe(key2);
        });
    });
});