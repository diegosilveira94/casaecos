import logoUrl from '../../../assets/brand-logo.png';
import wordmarkUrl from '../../../assets/brand-wordmark.png';

interface AppBrandProps {
  /** Stacked in the sidebar, side by side in the phone top bar. */
  layout: 'stacked' | 'inline';
}

export function AppBrand({ layout }: AppBrandProps): React.JSX.Element {
  return (
    <div className={`app-brand app-brand--${layout}`}>
      <img className="app-brand__logo" src={logoUrl} alt="" width={73} height={50} />
      <img
        className="app-brand__wordmark"
        src={wordmarkUrl}
        alt="Casa Ecos"
        width={117}
        height={18}
      />
    </div>
  );
}
