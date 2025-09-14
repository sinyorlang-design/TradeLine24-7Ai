import React from 'react';
import { ICONS, type IconKey } from '../../config/iconMap';

type Props = {
  name: IconKey;
  alt?: string;
  className?: string;
  size?: number | string;
};

export function Icon({ name, alt, className, size }: Props) {
  const src = ICONS[name];
  const style = size ? { width: size, height: size } : undefined;
  return <img src={src} alt={alt ?? name} className={className} style={style} loading="lazy" />;
}
