"use client";
export default function ShopLogo({ logo, className = "h-10 w-10", name = "Movoora" }: { logo?: string; className?: string; name?: string }) {
  return <img src={logo || "/movoora-mark.svg?v=2"} alt={name} className={`${className} object-contain`} />;
}
