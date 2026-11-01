import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { ptBR, type PickersInputLocaleText } from '@mui/x-date-pickers/locales';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/pt-br';
import { useState } from 'react';

const DAY_FORMAT = 'YYYY-MM-DD';
const PICKER_TEXTS = ptBR.components.MuiLocalizationProvider.defaultProps
  .localeText as PickersInputLocaleText;

function toDayText(day: Dayjs | null): string {
  return day?.isValid() ? day.format(DAY_FORMAT) : '';
}

interface FormDatePickerProps {
  label: string;
  /** The day as `YYYY-MM-DD`; empty while there is none. */
  value: string;
  /** First day that can be picked, in the same format. */
  minDay?: string;
  isRequired?: boolean;
  isDisabled?: boolean;
  error?: string | undefined;
  /** Takes the whole row of the form on the phone. */
  isWideOnPhone?: boolean;
  onChange: (day: string) => void;
}

/** Calendar over a typed field; the form keeps the day as text, like the native input did. */
export function FormDatePicker({
  label,
  value,
  minDay,
  isRequired = false,
  isDisabled = false,
  error,
  isWideOnPhone = false,
  onChange,
}: FormDatePickerProps): React.JSX.Element {
  // A half-typed date reaches the form as empty, but has to stay on the field.
  const [typedDay, setTypedDay] = useState<Dayjs | null>(null);
  const day = toDayText(typedDay) === value ? typedDay : value === '' ? null : dayjs(value);

  return (
    <LocalizationProvider
      adapterLocale="pt-br"
      dateAdapter={AdapterDayjs}
      localeText={PICKER_TEXTS}
    >
      <DatePicker
        label={label}
        value={day}
        disabled={isDisabled}
        {...(minDay ? { minDate: dayjs(minDay) } : {})}
        onChange={(pickedDay) => {
          setTypedDay(pickedDay);
          onChange(toDayText(pickedDay));
        }}
        slotProps={{
          textField: {
            ...(isWideOnPhone ? { sx: { gridColumn: { xs: '1 / -1', md: 'auto' } } } : {}),
            fullWidth: true,
            required: isRequired,
            error: error !== undefined,
            helperText: error,
          },
        }}
      />
    </LocalizationProvider>
  );
}
