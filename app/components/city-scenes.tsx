import Image from "next/image";
import ArrowIcon from "./arrow-icon";

const scenes = [
  {
    id: "nyc",
    city: "New York",
    label: "01 / EAST COAST",
    title: "Concrete rhythm.",
    note: "Brick walls. Fire escapes. Beats that carry down the block.",
  },
  {
    id: "la",
    city: "Los Angeles",
    label: "02 / WEST COAST",
    title: "Golden-hour groove.",
    note: "Sun-faded murals. Backstreet color. A little West Coast swagger.",
  },
  {
    id: "atl",
    city: "Atlanta",
    label: "03 / THE SOUTH",
    title: "Southern swing.",
    note: "Red brick. Big hooks. The whole neighborhood moving together.",
  },
];

export default function CityScenes() {
  return (
    <section className="scene-manifesto" aria-labelledby="scene-title">
      <div className="scene-heading">
        <div>
          <p className="eyebrow">
            A STREET-CULTURE MOODBOARD / 1990s INSPIRATION
          </p>
          <h2 id="scene-title">
            Three cities.
            <br />
            <span>One loud era.</span>
          </h2>
        </div>
        <p>
          From the sidewalk to the dance floor.
          <br />A little grit, a lot of soul.
        </p>
      </div>
      <div className="city-scenes">
        {scenes.map((scene) => (
          <article className={`city-scene scene-${scene.id}`} key={scene.id}>
            <div className="city-scene-photo">
              <Image
                src={`/images/side-b-${scene.id}.png`}
                alt=""
                fill
                sizes="(max-width: 540px) 88vw, 29vw"
                style={{ objectFit: "cover" }}
              />
              <span className="city-location">{scene.city}</span>
              <span className="scene-tape" aria-hidden="true" />
            </div>
            <div className="city-scene-caption">
              <span>{scene.label}</span>
              <h3>{scene.title}</h3>
              <p>{scene.note}</p>
            </div>
          </article>
        ))}
      </div>
      <div className="scene-source-note">
        <p>
          Original AI-generated street-scene artwork inspired by 90s music-video
          culture.
        </p>
        <a href="#collection">
          Find the soundtrack <ArrowIcon />
        </a>
      </div>
    </section>
  );
}
