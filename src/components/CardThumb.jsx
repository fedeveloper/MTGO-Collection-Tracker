import React from 'react';

const CARD_BACK = 'https://svgs.scryfall.io/card-back.svg';

// Art crop of a card (falls back to the full image, then to the card back)
export function CardThumb({ card, className = 'thumb', full = false }) {
  const src = (full ? card.imageUri : card.artCrop || card.imageUri) || CARD_BACK;
  return (
    <img
      className={className}
      src={src}
      alt=""
      loading="lazy"
      onError={(e) => {
        if (e.currentTarget.src !== CARD_BACK) e.currentTarget.src = CARD_BACK;
      }}
    />
  );
}
