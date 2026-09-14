/** Lightweight line art for the event. Decorative, with no remote assets. */
export function EventIllustration() {
  return (
    <svg
      viewBox="0 0 420 340"
      fill="none"
      className="event-art h-full w-full"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M53 104C62 57 130 28 187 44C236 57 247 42 285 68C330 97 376 155 349 215C323 275 247 287 181 271C116 255 42 220 48 162C50 141 48 126 53 104Z"
        fill="var(--art-mint)"
      />
      <path
        d="M277 183C306 167 358 190 371 223C384 257 351 294 319 286C290 279 263 265 263 235C263 215 261 192 277 183Z"
        fill="var(--art-lavender)"
      />
      <path
        d="M65 258C42 261 15 253 23 234C31 215 72 233 71 250C70 267 34 287 54 303C67 313 90 303 100 294"
        stroke="var(--art-line)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M321 47C341 38 355 40 361 57C366 70 354 81 344 75C333 69 349 54 362 64C382 78 382 103 389 111"
        stroke="var(--art-tab)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <g className="event-art-page">
        <path
          d="M269 41L320 52L308 120L260 109L269 41Z"
          fill="var(--art-paper)"
          stroke="var(--art-line)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M279 58L307 64M277 67L304 73M275 77L295 81"
          stroke="var(--art-line-soft)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M279 29C284 24 291 28 290 34L284 65C283 71 275 70 276 64L281 39"
          stroke="var(--art-line)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      <g
        className="event-art-book"
        stroke="var(--art-ink)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d="M91 130L203 149L320 123L337 237L223 267L110 244L91 130Z"
          fill="var(--art-mint)"
        />
        <path
          d="M88 123C127 117 167 127 204 146C237 118 274 109 310 113L326 226C282 221 252 235 221 256C185 235 152 229 107 235L88 123Z"
          fill="var(--art-paper)"
        />
        <path
          d="M204 146L221 256M97 134C134 128 168 140 193 154M103 148C131 145 170 154 194 166M113 216C149 211 181 223 209 239M227 237C255 217 286 208 316 211M215 152C242 130 278 123 301 125M217 164C245 142 278 137 302 139"
          stroke="var(--art-line)"
        />
        <path
          d="M117 170C141 166 170 174 188 183M119 181C144 176 169 185 187 191M122 193C144 189 162 192 174 196M233 178C253 163 277 157 300 158M235 189C255 175 279 170 302 171M237 201C253 190 270 186 285 185"
          stroke="var(--art-line-soft)"
          strokeWidth="1.3"
        />
        <path
          d="M251 126L259 180L269 168L279 176L272 119"
          fill="var(--art-tab)"
          stroke="var(--lavender)"
        />
        <path
          d="M109 240L222 262L329 232"
          stroke="var(--art-line)"
          strokeWidth="1.2"
        />
      </g>
      <g transform="rotate(-8 107 85)">
        <path
          d="M61 62L152 60L157 103L61 107L61 62Z"
          fill="var(--art-warm)"
          stroke="var(--art-line-soft)"
          strokeWidth="1.2"
        />
        <path
          d="M76 77H137M76 87H130M76 97H141"
          stroke="var(--art-line)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
      <path
        d="M139 292C172 309 213 309 244 294M242 286L248 293L239 301"
        stroke="var(--champagne)"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M339 139C350 148 356 160 355 173M348 167L355 176L363 169"
        stroke="var(--art-line-soft)"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M41 140L37 133M32 149L23 148M367 297L370 303"
        stroke="var(--art-line)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
