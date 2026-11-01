import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import type { EventResponse } from '@casaecos/shared-types';

import { dayKey, isSameDay } from '../domain/calendar-dates.js';
import type { CalendarMonth } from '../domain/calendar-month.js';
import { eventSubject, formatDayLabel, formatTime } from '../domain/event-format.js';
import { eventColors } from '../domain/event-tone.js';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MAX_DOTS_PER_DAY = 3;
// One block per day, like the prototype; the rest goes behind "+N compromissos".
const MAX_BLOCKS_PER_DAY = 1;
const WEEK_ROW = { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' };

interface MonthGridProps {
  month: CalendarMonth;
  today: Date;
  selectedDay: Date;
  eventsByDay: ReadonlyMap<string, EventResponse[]>;
  isLoading: boolean;
  onSelectDay: (day: Date) => void;
  onOpenEvent: (event: EventResponse) => void;
}

interface DayCellProps {
  day: Date;
  events: EventResponse[];
  isOutside: boolean;
  isSelected: boolean;
  isToday: boolean;
  onSelectDay: (day: Date) => void;
  onOpenEvent: (event: EventResponse) => void;
}

type DayNumberSx = Record<string, unknown>;

const FILLED_NUMBER = { bgcolor: 'primary.main', color: 'common.white', fontWeight: 600 };
const BLOCK_LINE = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

// On the phone the selected day is the filled one; on the desktop, only today is.
function dayNumberSx(isOutside: boolean, isSelected: boolean, isToday: boolean): DayNumberSx {
  if (isToday && isSelected) return FILLED_NUMBER;
  if (isToday) {
    return {
      color: { xs: 'primary.main', md: 'common.white' },
      bgcolor: { md: 'primary.main' },
      border: { xs: 1.5, md: 0 },
      borderColor: { xs: 'primary.main' },
      fontWeight: 600,
    };
  }
  if (isSelected) {
    return {
      bgcolor: { xs: 'primary.main', md: 'transparent' },
      color: { xs: 'common.white', md: 'text.primary' },
      fontWeight: { xs: 600, md: 400 },
    };
  }
  return isOutside ? { color: 'text.disabled' } : {};
}

/** Phone: the number (with dots) picks the day. Desktop: blocks open the commitment. */
function DayCell({
  day,
  events,
  isOutside,
  isSelected,
  isToday,
  onSelectDay,
  onOpenEvent,
}: DayCellProps): React.JSX.Element {
  const blocks = events.slice(0, MAX_BLOCKS_PER_DAY);
  const hiddenCount = events.length - blocks.length;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: { xs: 'center', md: 'stretch' },
        gap: { md: 0.5 },
        minWidth: 0,
        minHeight: { md: '7.6rem' },
        p: { md: 1 },
        '&:not(:first-of-type)': { borderLeft: { md: 1 }, borderColor: { md: 'divider' } },
      }}
    >
      <ButtonBase
        disabled={isOutside}
        aria-pressed={isSelected}
        aria-label={isOutside ? undefined : formatDayLabel(day, events.length)}
        onClick={() => {
          onSelectDay(day);
        }}
        sx={{
          flexDirection: 'column',
          alignItems: { xs: 'center', md: 'flex-start' },
          gap: 0.25,
          minHeight: { xs: '3.4rem', md: 0 },
          px: { xs: 0.5, md: 0 },
          py: { xs: 0.5, md: 0 },
          borderRadius: 2,
        }}
      >
        <Box
          component="span"
          sx={{
            display: 'grid',
            placeItems: 'center',
            width: 32,
            height: 32,
            borderRadius: '50%',
            fontSize: { xs: '0.92rem', md: '1.05rem' },
            ...dayNumberSx(isOutside, isSelected, isToday),
          }}
        >
          {day.getDate()}
        </Box>
        {events.length > 0 ? (
          <Stack
            component="span"
            direction="row"
            aria-hidden="true"
            spacing={0.25}
            sx={{ display: { md: 'none' } }}
          >
            {events.slice(0, MAX_DOTS_PER_DAY).map((event) => (
              <Box
                key={event.id}
                component="span"
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  bgcolor: eventColors(event.eventType.id).color,
                }}
              />
            ))}
          </Stack>
        ) : null}
      </ButtonBase>

      {blocks.map((event) => (
        <ButtonBase
          key={event.id}
          onClick={() => {
            onOpenEvent(event);
          }}
          sx={{
            display: { xs: 'none', md: 'grid' },
            justifyItems: 'start',
            px: 1,
            py: 0.75,
            borderRadius: 1,
            bgcolor: eventColors(event.eventType.id).tint,
            fontSize: '0.72rem',
            lineHeight: 1.35,
            textAlign: 'left',
            '& > *': { ...BLOCK_LINE, maxWidth: '100%' },
          }}
        >
          <span>{formatTime(event.startDate)}</span>
          <Box component="strong" sx={{ fontWeight: 600 }}>
            {event.title}
          </Box>
          <Box component="span" sx={{ color: 'text.secondary' }}>
            {eventSubject(event)}
          </Box>
        </ButtonBase>
      ))}
      {hiddenCount > 0 ? (
        <ButtonBase
          onClick={() => {
            onSelectDay(day);
          }}
          sx={{
            display: { xs: 'none', md: 'block' },
            color: 'primary.main',
            fontSize: '0.78rem',
            fontWeight: 500,
          }}
        >
          +{hiddenCount} {hiddenCount === 1 ? 'compromisso' : 'compromissos'}
        </ButtonBase>
      ) : null}
    </Box>
  );
}

export function MonthGrid({
  month,
  today,
  selectedDay,
  eventsByDay,
  isLoading,
  onSelectDay,
  onOpenEvent,
}: MonthGridProps): React.JSX.Element {
  return (
    <div aria-busy={isLoading}>
      <Box
        aria-hidden="true"
        sx={{ ...WEEK_ROW, borderBottom: { md: 1 }, borderColor: { md: 'divider' } }}
      >
        {WEEKDAYS.map((weekday) => (
          <Typography
            key={weekday}
            component="span"
            variant="body2"
            sx={{
              py: { xs: 0.5, md: 1 },
              color: { xs: 'text.secondary', md: 'text.primary' },
              fontSize: { xs: '0.75rem', md: '0.95rem' },
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            {weekday}
          </Typography>
        ))}
      </Box>

      <Box sx={{ opacity: isLoading ? 0.6 : 1 }} role="group" aria-label={`Dias de ${month.label}`}>
        {month.weeks().map((week) => (
          <Box
            key={dayKey(week[0] ?? month.firstDay)}
            sx={{
              ...WEEK_ROW,
              '&:not(:first-of-type)': { borderTop: { md: 1 }, borderColor: { md: 'divider' } },
            }}
          >
            {week.map((day) => {
              const isOutside = !month.contains(day);
              return (
                <DayCell
                  key={dayKey(day)}
                  day={day}
                  events={isOutside ? [] : (eventsByDay.get(dayKey(day)) ?? [])}
                  isOutside={isOutside}
                  isSelected={!isOutside && isSameDay(day, selectedDay)}
                  isToday={isSameDay(day, today)}
                  onSelectDay={onSelectDay}
                  onOpenEvent={onOpenEvent}
                />
              );
            })}
          </Box>
        ))}
      </Box>
    </div>
  );
}
