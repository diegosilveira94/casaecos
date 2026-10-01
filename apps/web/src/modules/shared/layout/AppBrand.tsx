import { BrandMark } from './BrandMark.js';

export function AppBrand(): React.JSX.Element {
  return (
    <div className="brand-lockup brand-lockup--compact">
      <BrandMark />
      <div>
        <strong>Casa Ecos</strong>
        <span>Ecos da Esperança</span>
      </div>
    </div>
  );
}
