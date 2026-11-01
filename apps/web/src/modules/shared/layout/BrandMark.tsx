import { SvgIcon } from '@mui/material';

export function BrandMark(): React.JSX.Element {
  return (
    <SvgIcon viewBox="0 0 48 48" sx={{ fontSize: '2.9rem' }}>
      <path
        fill="currentColor"
        fillOpacity={0.14}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.4}
        d="M24 42C16.2 34.2 8 27.4 8 18.4A9.4 9.4 0 0 1 24 11.6a9.4 9.4 0 0 1 16 6.8c0 9-8.2 15.8-16 23.6Z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.4}
        d="M24 35.5V17m0 10.5-7-7m7 2.5 7-7"
      />
    </SvgIcon>
  );
}
