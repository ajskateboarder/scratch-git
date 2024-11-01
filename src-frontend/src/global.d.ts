interface Window {
    _downloadFromScaffold(): any
    _startScaffold(e: KeyboardEvent & {target: HTMLElement}): any
    _stopScaffold(): any
}

declare module "*.svg" {
    const content: string
    export default content
}