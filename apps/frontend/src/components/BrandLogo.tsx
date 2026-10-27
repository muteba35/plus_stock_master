import styles from "./BrandLogo.module.css";

type BrandLogoProps = {
  className?: string;
  inverse?: boolean;
  compact?: boolean;
};

export default function BrandLogo({ className = "", inverse = false, compact = false }: BrandLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={compact ? "0 0 64 64" : "0 0 280 64"}
      width={compact ? 64 : 280}
      height="64"
      role="img"
      aria-label="movoora"
      focusable="false"
      className={`${styles.logo} ${inverse ? styles.inverse : ""} ${className}`}
    >
      <g className={styles.blue}>
        <path d="M6 30V4H34C49 4 58 13 58 26H44C44 21 40 18 33 18H20V30Z" />
        <path d="M58 34V60H30C15 60 6 51 6 38H20C20 43 24 46 31 46H44V34Z" />
      </g>
      {!compact && (
        <text x="83" y="47" fontFamily="Segoe UI, Arial, sans-serif" fontSize="49" fontWeight="400" letterSpacing="0">
          <tspan className={styles.word}>mo</tspan><tspan className={styles.blue}>voora</tspan>
        </text>
      )}
    </svg>
  );
}
