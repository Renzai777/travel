import { createContext, useContext } from "react";
import type { Tag } from "../workspace/tags";

/** The workspace's tags, for cards and the Details panel inside the board. */
export const TagsContext = createContext<readonly Tag[]>([]);
export const useBoardTags = () => useContext(TagsContext);
