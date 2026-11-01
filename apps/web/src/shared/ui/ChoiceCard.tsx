import { Checkbox, FormControlLabel, Radio } from '@mui/material';

interface ChoiceCardProps {
  kind: 'radio' | 'checkbox';
  /** Groups the radios of one question. */
  name?: string;
  label: React.ReactNode;
  isChecked: boolean;
  isDisabled?: boolean;
  /** Tooltip, such as why the option is blocked. */
  title?: string | undefined;
  /** Colors of the card while checked; the default is the brand green. */
  checkedColors?: { color: string; tint: string };
  onChange: (isChecked: boolean) => void;
}

/** An option as a card: one tap each, with no list to open on the phone. */
export function ChoiceCard({
  kind,
  name,
  label,
  isChecked,
  isDisabled = false,
  title,
  checkedColors = { color: 'primary.main', tint: 'primary.light' },
  onChange,
}: ChoiceCardProps): React.JSX.Element {
  const Control = kind === 'radio' ? Radio : Checkbox;

  return (
    <FormControlLabel
      title={title}
      label={label}
      control={
        <Control
          size="small"
          {...(name === undefined ? {} : { name })}
          checked={isChecked}
          disabled={isDisabled}
          onChange={(changeEvent) => {
            onChange(changeEvent.target.checked);
          }}
        />
      }
      sx={{
        m: 0,
        minWidth: 0,
        py: 0.5,
        pr: 1.5,
        border: 1,
        borderColor: isChecked ? checkedColors.color : 'divider',
        borderRadius: 2,
        bgcolor: isChecked ? checkedColors.tint : 'background.paper',
        '&:hover': { borderColor: isChecked ? checkedColors.color : 'text.secondary' },
        '& .MuiFormControlLabel-label': { minWidth: 0, fontSize: '0.9rem' },
      }}
    />
  );
}
