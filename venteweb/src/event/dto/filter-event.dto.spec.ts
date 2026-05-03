import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FilterEventDto } from './filter-event.dto';

describe('FilterEventDto', () => {
  it('allows omitting page and limit (defaults applied in EventService)', async () => {
    const dto = plainToInstance(FilterEventDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts explicit page and limit from query strings', async () => {
    const dto = plainToInstance(
      FilterEventDto,
      { page: '3', limit: '10' },
      { enableImplicitConversion: true },
    );
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(3);
    expect(dto.limit).toBe(10);
  });
});
