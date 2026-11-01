import type { CSSProperties } from "react";
import { photosFor } from "../data/photos";
import { Photo } from "../components/Photo";
import { Zoomable } from "../components/Zoomable";
import { useReveal } from "../lib/useReveal";
import type { Photo as PhotoType } from "../types/photo";

const FOOD_NOTES: Record<string, string> = {
  "food-1": "Old Delhi · Haridwar",
  "food-2": "Chandni Chowk",
  "food-3": "Paranthe Wali Gali",
  "food-4": "Dehradun's Tibetan colony",
  "food-5": "Mathura's famous sweet",
  "food-6": "Almora's signature",
  "food-7": "Every dhaba, every hill",
  "food-8": "Braj kulhad lassi",
};

function FoodCard({ p, i, list }: { p: PhotoType; i: number; list: PhotoType[] }) {
  const [ref, shown] = useReveal<HTMLElement>();
  const style = {
    "--tilt": `${i % 2 ? 1.5 : -1.5}deg`,
    "--d": `${(i % 4) * 80}ms`,
  } as CSSProperties;

  return (
    <figure ref={ref} className={`food-card reveal f${i + 1}${shown ? " in" : ""}`} style={style}>
      <Zoomable p={p} list={list}>
        <Photo p={p} />
      </Zoomable>
      <figcaption>
        <b>{p.caption}</b>
        <span>{FOOD_NOTES[p.key] || ""}</span>
      </figcaption>
    </figure>
  );
}

export function Food() {
  const foods = photosFor("food");

  return (
    <section className="section food" id="food" aria-labelledby="food-heading">
      <div className="section-head">
        <p className="eyebrow">Taste of the trail</p>
        <h2 id="food-heading">Eat your way north</h2>
        <p>
          From Braj's milk sweets and Old Delhi's fried breads to momos in the Doon and bal mithai in Almora — every
          stop has a signature bite.
        </p>
      </div>
      <div className="food-grid" id="foodGrid">
        {foods.map((p, i) => (
          <FoodCard key={p.key} p={p} i={i} list={foods} />
        ))}
      </div>
    </section>
  );
}
