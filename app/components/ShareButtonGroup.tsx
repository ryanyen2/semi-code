import { MakeRealButton } from "./MakeRealButton";
import { ExecuteCodeButton } from "./ExecuteCodeButton";


export function ShareButtonGroup() {
    return (
        <div className="shareButtonGroup">
            <MakeRealButton />
            <ExecuteCodeButton />
        </div>
    )
}