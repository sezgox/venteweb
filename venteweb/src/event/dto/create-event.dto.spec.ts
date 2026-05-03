import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Category, Visibility } from 'generated/prisma';
import { CreateEventDto } from './create-event.dto';

describe('CreateEventDto temporal validation', () => {
  const baseNow = new Date('2026-03-28T12:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(baseNow);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function validateDto(overrides: Partial<CreateEventDto> = {}) {
    const dto = plainToInstance(CreateEventDto, {
      organizerId: 'organizer-1',
      name: 'Community lunch',
      categories: [Category.Meetup],
      description: 'Bring food and good vibes.',
      visibility: Visibility.Public,
      onlyVirtual: false,
      onSite: {
        lat: 40.4168,
        lng: -3.7038,
        location: 'Plaza Mayor, Madrid',
        locationAlias: 'Plaza Mayor',
        startDate: new Date('2026-03-28T16:00:00.000Z'),
        endDate: new Date('2026-03-28T17:30:00.000Z'),
      },
      ...overrides,
    });

    return validate(dto);
  }

  it('fails when startDate is less than 4 hours ahead', async () => {
    const errors = await validateDto({
      onSite: {
        lat: 40.4168,
        lng: -3.7038,
        location: 'Plaza Mayor, Madrid',
        locationAlias: 'Plaza Mayor',
        startDate: new Date('2026-03-28T15:59:00.000Z'),
        endDate: new Date('2026-03-28T17:30:00.000Z'),
      },
    });

    expect(JSON.stringify(errors)).toContain(
      'Start date must be at least 4 hours ahead of the current time.'
    );
  });

  it('passes when startDate is at least 4 hours ahead', async () => {
    const errors = await validateDto();

    expect(errors).toHaveLength(0);
  });

  it('keeps the minimum event duration of 1 hour', async () => {
    const errors = await validateDto({
      onSite: {
        lat: 40.4168,
        lng: -3.7038,
        location: 'Plaza Mayor, Madrid',
        locationAlias: 'Plaza Mayor',
        startDate: new Date('2026-03-28T16:00:00.000Z'),
        endDate: new Date('2026-03-28T16:30:00.000Z'),
      },
    });

    expect(JSON.stringify(errors)).toContain('Event duration must be at least 1 hour.');
  });

  it('still rejects start dates more than one year ahead', async () => {
    const errors = await validateDto({
      onSite: {
        lat: 40.4168,
        lng: -3.7038,
        location: 'Plaza Mayor, Madrid',
        locationAlias: 'Plaza Mayor',
        startDate: new Date('2027-03-28T16:00:01.000Z'),
        endDate: new Date('2027-03-28T18:00:01.000Z'),
      },
    });

    expect(JSON.stringify(errors)).toContain('Start date cannot be more than 1 year from today.');
  });

  it('still rejects events longer than 30 days', async () => {
    const errors = await validateDto({
      onSite: {
        lat: 40.4168,
        lng: -3.7038,
        location: 'Plaza Mayor, Madrid',
        locationAlias: 'Plaza Mayor',
        startDate: new Date('2026-03-28T16:00:00.000Z'),
        endDate: new Date('2026-04-28T16:00:00.000Z'),
      },
    });

    expect(JSON.stringify(errors)).toContain('Event duration cannot exceed 30 days.');
  });
});
