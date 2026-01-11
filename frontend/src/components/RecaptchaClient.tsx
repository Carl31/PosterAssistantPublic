import { useState, useEffect } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

export default function ResponsiveRecaptcha({ onChange }: { onChange: (token: string | null) => void }) {
  const [size, setSize] = useState<'normal' | 'compact'>('normal');

  useEffect(() => {
    function updateSize() {
      if (window.innerWidth < 400) {
        setSize('compact'); // mobile
      } else {
        setSize('normal'); // desktop/tablet
      }
    }

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div className="w-full flex justify-center">
      <ReCAPTCHA
        sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
        onChange={onChange}
        size={size}
      />
    </div>
  );
}
