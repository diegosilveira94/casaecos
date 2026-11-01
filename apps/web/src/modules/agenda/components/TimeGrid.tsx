import { Box, ButtonBase, CircularProgress, Stack, Typography } from '@mui/material';
import type { CSSProperties } from 'react';

import type { EventResponse } from '@casaecos/shared-types';

import { dayKey, isSameDay } from '../domain/calendar-dates.js';
import { eventSubject, formatTimeRange } from '../domain/event-format.js';
import { eventColors } from '../domain/event-tone.js';

const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 20;
const HOUR_HEIGHT = 64;
const MIN_EVENT_HEIGHT = 34;

const HOURS_COLUMN = '4.25rem';
const NOTICE_SX = {
  position: 'absolute',
  top: '7.5rem',
  left: '50%',
  zIndex: 2,
  px: 1.75,
  py: 1.25,
  borderRadius: 2,
  bgcolor: 'background.paper',
  color: 'text.secondary',
  fontSize: '0.85rem',
  transform: 'translateX(-50%)',
};
const DAY_HEADING_SX = {
  display: 'grid',
  justifyItems: 'center',
  gap: 0.25,
  minHeight: '4.25rem',
  px: 0.5,
  py: 1,
  color: 'text.secondary',
  borderLeft: 1,
  borderColor: 'divider',
};
const EVENT_LINE_SX = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

const weekdayFormat = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' });

interface TimeGridProps {
  days: Date[];
  today: Date;
  eventsByDay: ReadonlyMap<string, EventResponse[]>;
  isLoading: boolean;
  hasError: boolean;
  label: string;
  onOpenEvent: (event: EventResponse) => void;
  onShowDay?: (day: Date) => void;
}

function minutesOf(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function eventEndMinutes(event: EventResponse, start: Date): number {
  if (event.endDate === null) return Math.min(24 * 60, minutesOf(start) + 60);

  const end = new Date(event.endDate);
  return isSameDay(start, end) ? minutesOf(end) : 24 * 60;
}

function visibleHours(events: EventResponse[]): { startHour: number; endHour: number } {
  let startHour = DEFAULT_START_HOUR;
  let endHour = DEFAULT_END_HOUR;

  for (const event of events) {
    const start = new Date(event.startDate);
    startHour = Math.min(startHour, start.getHours());
    endHour = Math.max(endHour, Math.ceil(eventEndMinutes(event, start) / 60));
  }

  return { startHour: Math.max(0, startHour), endHour: Math.min(24, endHour) };
}

function eventStyle(event: EventResponse, startHour: number, endHour: number): CSSProperties {
  const start = new Date(event.startDate);
  const startMinutes = minutesOf(start);
  const top = ((startMinutes - startHour * 60) / 60) * HOUR_HEIGHT;
  const visibleEnd = Math.min(eventEndMinutes(event, start), endHour * 60);
  const durationMinutes = Math.max(30, visibleEnd - startMinutes);

  return {
    top: `${String(top)}px`,
    height: `${String(Math.max(MIN_EVENT_HEIGHT, (durationMinutes / 60) * HOUR_HEIGHT))}px`,
  };
}

export function TimeGrid({
  days,
  today,
  eventsByDay,
  isLoading,
  hasError,
  label,
  onOpenEvent,
  onShowDay,
}: TimeGridProps): React.JSX.Element {
  const isDayView = days.length === 1;
  const events = days.flatMap((day) => eventsByDay.get(dayKey(day)) ?? []);
  const { startHour, endHour } = visibleHours(events);
  const hourCount = endHour - startHour;
  const hours = Array.from({ length: hourCount + 1 }, (_, offset) => startHour + offset);
  const gridHeight = `${String(hourCount * HOUR_HEIGHT)}px`;
  const minGridWidth = `calc(${HOURS_COLUMN} + ${String(days.length)} * 5rem)`;

  return (
    <Box
      aria-busy={isLoading}
      sx={{ position: 'relative', minWidth: 0, opacity: isLoading ? 0.65 : 1 }}
    >
      <Box role="group" aria-label={label} sx={{ maxHeight: '39rem', overflow: 'auto' }}>
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 3,
            display: 'grid',
            gridTemplateColumns: `${HOURS_COLUMN} repeat(${String(days.length)}, minmax(5rem, 1fr))`,
            minWidth: minGridWidth,
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <span aria-hidden="true" />
          {days.map((day) => {
            const isToday = isSameDay(day, today);
            const content = (
              <>
                <Typography component="span" variant="caption" sx={{ textTransform: 'uppercase' }}>
                  {weekdayFormat.format(day).replace('.', '')}
                </Typography>
                <Box
                  component="strong"
                  sx={{
                    display: 'grid',
                    placeItems: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: isToday ? 'primary.main' : 'transparent',
                    color: isToday ? 'common.white' : 'text.primary',
                  }}
                >
                  {day.getDate()}
                </Box>
              </>
            );

            return onShowDay ? (
              <ButtonBase
                key={dayKey(day)}
                aria-label={`Ver dia ${String(day.getDate())}`}
                onClick={() => {
                  onShowDay(day);
                }}
                sx={{ ...DAY_HEADING_SX, '&:hover': { bgcolor: 'action.hover' } }}
              >
                {content}
              </ButtonBase>
            ) : (
              <Box key={dayKey(day)} sx={DAY_HEADING_SX}>
                {content}
              </Box>
            );
          })}
        </Box>

        <Box
          sx={{
            position: 'relative',
            display: 'grid',
            gridTemplateColumns: `${HOURS_COLUMN} minmax(0, 1fr)`,
            height: gridHeight,
            minWidth: minGridWidth,
          }}
        >
          <Box
            aria-hidden="true"
            sx={{ position: 'relative', borderRight: 1, borderColor: 'divider' }}
          >
            {hours.map((hour, position) => (
              <Typography
                key={hour}
                component="span"
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  position: 'absolute',
                  right: '0.65rem',
                  top: `${String((hour - startHour) * HOUR_HEIGHT)}px`,
                  transform: position === 0 ? 'translateY(0.2rem)' : 'translateY(-50%)',
                }}
              >
                {String(hour).padStart(2, '0')}:00
              </Typography>
            ))}
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${String(days.length)}, minmax(0, 1fr))`,
            }}
          >
            {days.map((day) => (
              <Box
                key={dayKey(day)}
                sx={{
                  position: 'relative',
                  display: 'grid',
                  gridTemplateRows: `repeat(${String(hourCount)}, ${String(HOUR_HEIGHT)}px)`,
                  height: gridHeight,
                  '&:not(:first-of-type)': { borderLeft: 1, borderColor: 'divider' },
                }}
              >
                {hours.slice(0, -1).map((hour) => (
                  <Box
                    key={hour}
                    component="span"
                    aria-hidden="true"
                    sx={{ borderTop: 1, borderColor: 'divider' }}
                  />
                ))}
                {(eventsByDay.get(dayKey(day)) ?? []).map((event) => {
                  const { color, tint } = eventColors(event.eventType.id);
                  return (
                    <ButtonBase
                      key={event.id}
                      style={eventStyle(event, startHour, endHour)}
                      onClick={() => {
                        onOpenEvent(event);
                      }}
                      sx={{
                        position: 'absolute',
                        zIndex: 1,
                        left: isDayView ? 8 : 3,
                        right: isDayView ? 16 : 3,
                        display: 'grid',
                        alignContent: 'start',
                        justifyItems: 'start',
                        minHeight: 34,
                        overflow: 'hidden',
                        px: isDayView ? 1.25 : 0.75,
                        py: 0.5,
                        bgcolor: tint,
                        borderLeft: 3,
                        borderColor: color,
                        borderRadius: 1,
                        fontSize: isDayView ? '0.78rem' : '0.68rem',
                        lineHeight: 1.25,
                        textAlign: 'left',
                        '& > *': { ...EVENT_LINE_SX, maxWidth: '100%' },
                      }}
                    >
                      <span>{formatTimeRange(event)}</span>
                      <Box component="strong" sx={{ fontSize: isDayView ? '0.88rem' : '0.74rem' }}>
                        {event.title}
                      </Box>
                      <Box component="small" sx={{ color: 'text.secondary', fontSize: '0.66rem' }}>
                        {eventSubject(event)}
                      </Box>
                    </ButtonBase>
                  );
                })}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
      {isLoading ? (
        <Stack
          direction="row"
          role="status"
          spacing={1}
          sx={{ ...NOTICE_SX, alignItems: 'center', whiteSpace: 'nowrap' }}
        >
          <CircularProgress size={16} aria-hidden="true" />
          <span>Carregando compromissos...</span>
        </Stack>
      ) : events.length === 0 && !hasError ? (
        <Box sx={NOTICE_SX}>Nenhum compromisso neste período.</Box>
      ) : null}
    </Box>
  );
}
