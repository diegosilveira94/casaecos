import { addDays, toOffsetIsoString } from './calendar-dates.js';

const DAYS_IN_WEEK = 7;

const monthNameFormat = new Intl.DateTimeFormat('pt-BR', { month: 'long' });

export interface CalendarPeriod {
  from: string;
  to: string;
}

/** A month of the agenda grid, weeks running Sunday to Saturday like the prototype. */
export class CalendarMonth {
  private constructor(
    readonly year: number,
    readonly monthIndex: number,
  ) {}

  static containing(date: Date): CalendarMonth {
    return new CalendarMonth(date.getFullYear(), date.getMonth());
  }

  get firstDay(): Date {
    return new Date(this.year, this.monthIndex, 1);
  }

  /** "Setembro 2026". */
  get label(): string {
    const monthName = monthNameFormat.format(this.firstDay);
    return `${monthName.charAt(0).toUpperCase()}${monthName.slice(1)} ${String(this.year)}`;
  }

  next(): CalendarMonth {
    return CalendarMonth.containing(new Date(this.year, this.monthIndex + 1, 1));
  }

  previous(): CalendarMonth {
    return CalendarMonth.containing(new Date(this.year, this.monthIndex - 1, 1));
  }

  contains(date: Date): boolean {
    return date.getFullYear() === this.year && date.getMonth() === this.monthIndex;
  }

  /** Half-open, like the API filter: `from <= startDate < to`. */
  period(): CalendarPeriod {
    return {
      from: toOffsetIsoString(this.firstDay),
      to: toOffsetIsoString(this.next().firstDay),
    };
  }

  /** Whole weeks covering the month; the edges hold days of the neighbor months. */
  weeks(): Date[][] {
    const monthEnd = this.next().firstDay;
    const weeks: Date[][] = [];
    let weekStart = addDays(this.firstDay, -this.firstDay.getDay());

    while (weekStart < monthEnd) {
      const firstOfWeek = weekStart;
      weeks.push(Array.from({ length: DAYS_IN_WEEK }, (_, offset) => addDays(firstOfWeek, offset)));
      weekStart = addDays(weekStart, DAYS_IN_WEEK);
    }

    return weeks;
  }
}
