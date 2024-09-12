import { ScriptStatus } from "@/diff-indicators";

export interface Diff {
  oldContent: any;
  newContent: any;
  status: ScriptStatus;
  scriptNo: number | any[];
  script: string;
  added: number;
  removed: number;
  diffed: string;
}

export { DiffModal } from "./diff";
