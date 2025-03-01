import type { Data } from "../types";
import path from "path";

export async function getData({
  dataFile,
  startDate,
  endDate,
}: {
  dataFile: string;
  startDate: Date;
  endDate: Date;
}) {
  const module = await import(
    path.join(__dirname, "../../download/", dataFile)
  );
  const data = module.default as Data[];

  return data.filter(
    (d) =>
      new Date(d.timestamp) >= startDate && new Date(d.timestamp) <= endDate
  );
}
