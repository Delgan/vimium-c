import {
  OnChrome, OnFirefox, OnEdge, doc, deref_, weakRef_ff, chromeVer_, isJSUrl, parseOpenPageUrlOptions, safeCall,
  tryCreateRegExp, weakRef_not_ff, firefoxVer_, fgCache, max_, promiseDefer_
} from "../lib/utils"
import {
  IsInDOM_, isInTouchMode_cr_, MDW, hasTag_, CLK, attr_s, fullscreenEl_unsafe_, findAnchor_, dispatchAsync_,
  blur_unsafe, derefInDoc_, newEvent_, getRootNode_mounted, elFromPoint_, HTMLElementProto, getEditableType_,
  showPicker_
} from "../lib/dom_utils"
import { suppressTail_ } from "../lib/keyboard_utils"
import { Point2D, center_, getVisibleClientRect_, view_, selRange_, isContaining_ } from "../lib/rect"
import { insert_Lock_ } from "./insert"
import { post_, send_ } from "./port"
import { flash_, getSelected, getSelectionBoundingBox_, moveSel_s_throwable } from "./dom_ui"
import { coreHints, hintApi, hintManager, mode1_ as hintMode1_, hintOptions, isHintsActive } from "./link_hints"
import { prepareToBlockClick_old_ff, clickEventToPrevent_, dispatchAndBlockClickOnce_old_ff } from "./extend_click_ff"
import { currentScrolling, setNewScrolling, set_cachedScrollable } from "./scroller"
/* eslint-disable @typescript-eslint/await-thenable */

export declare const enum kClickAction {
  none = 0,
  plainMayOpenManually = 1, plainInNewTab = 2, plainInNewWindow = 3, MaxPlain = 3,
  forceToOpenInLastWnd = 4, forceInNewTab = 5, forceToOpenInCurrent = 6,
  // the [1..BaseMayInteract) before this line should always mean HTML <a>
  BaseMayInteract = 8, FlagDblClick = 1, FlagInteract = 2, MinNeverInteract = 16,
}
const enum ActionType {
  OnlyDispatch = 0,
  dblClick = kClickAction.FlagDblClick, interact = kClickAction.FlagInteract, isSelect = interact * 2,
  MinOpenUrl = kClickAction.MinNeverInteract - kClickAction.BaseMayInteract,
  DispatchAndMayOpenTab = MinOpenUrl, OpenTabButNotDispatch = DispatchAndMayOpenTab + 1,
}
export declare const enum kClickButton { none = 0, auxiliary = 1, second = 2, primaryAndTwice = 4, _others = 8 }
type AcceptableClickButtons = kClickButton.none | kClickButton.auxiliary | kClickButton.second
    | kClickButton.primaryAndTwice
type MyMouseControlKeys = [ altKey: boolean, ctrlKey: boolean, metaKey: boolean, shiftKey: boolean ]

type kMouseMoveEvents = "mouseover" | "mousemove" | "mouseout"
type kMouseEventsNotBubble = "mouseenter" | "mouseleave"
type kMouseClickEvents = "mousedown" | "mouseup" | "click" | "auxclick" | "dblclick" | "contextmenu"
type NullableSafeElForM = SafeElementForMouse | null | undefined

interface YieldedValue { 42: true }
interface YieldedPos { label_: number; sent_ (): YieldedValue | undefined }
type YieldableFunction = (pos: YieldedPos) => [/** step */ number, /** returned */ YieldedValue?]

let evIDC_cr: InputDeviceCapabilities | undefined
let lastHovered_: WeakRef<SafeElementForMouse> | null | undefined
let lastBubbledHovered_: WeakRef<SafeElementForMouse> | null | undefined | 0
let enableBubblesForEnterLeave_: BOOL | undefined

export { lastHovered_, evIDC_cr }
export function set_lastHovered_ (_newHovered: null): void { lastHovered_ = _newHovered }
export function set_lastBubbledHovered_ (_newBH: null): null { return lastBubbledHovered_ = _newBH }
export function set_evIDC_cr (_newIDC: InputDeviceCapabilities | undefined): void { evIDC_cr = _newIDC }

/** util functions */

const __generator = Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredGeneratorFunction
    ? (_0: void | undefined, branchedFunc: YieldableFunction): YieldableFunction => branchedFunc : 0 as never

const __myAwaiter = Build.BTypes & BrowserType.Chrome ? Build.MinCVer < BrowserVer.MinEnsuredGeneratorFunction
? (branchedFunc: () => YieldableFunction): Promise<any> => {
  const promise = promiseDefer_<any>()
  const resolveVoid = promise.r.bind(0, void 0)
  const generator = branchedFunc()
  let value_: YieldedValue | undefined, async_pos_: YieldedPos = { label_: 0, sent_: () => value_ }
  resume_()
  return promise.p
  function resume_(newValue?: YieldedValue): void {
    value_ = newValue
    let nextInst = Instruction.next
    while (~nextInst & Instruction.return) {
      let tmp = generator(async_pos_)
      nextInst = tmp[0], value_ = tmp.length > 1 ? tmp[1] : void 0
      if (Build.NDEBUG ? nextInst > Instruction.yield - 1 : nextInst === Instruction.yield) {
        async_pos_.label_++; nextInst = Instruction.yield | Instruction.return
      } else if (Build.NDEBUG ? nextInst > Instruction.break - 1 : nextInst === Instruction.break) {
        async_pos_.label_ = value_ as unknown as number
      } else if (!(Build.NDEBUG || nextInst === Instruction.next || nextInst === Instruction.return)) {
        throw Error("Assert error: unsupported async status: " + nextInst)
      }
    }
    Promise.resolve(value_).then(nextInst < Instruction.return + 1 ? promise.r : resume_
        , Build.NDEBUG ? resolveVoid : logDebugAndResolve)
  }
  function logDebugAndResolve(err: any): void {
    console.log("Vimium C: an async function fails:", err)
    resolveVoid()
  }
}
: Build.MinCVer < BrowserVer.MinEnsuredES2017AsyncFunctions
? <TNext, TReturn> (generatorFunction: () => Generator<TNext | TReturn | Promise<TNext | TReturn>, TReturn, TNext>
    ): Promise<TReturn | void> => {
  const promise = promiseDefer_<TReturn | void>()
  const resolveVoid = Build.MinCVer < BrowserVer.MinTestedES6Environment ? promise.r.bind(0, void 0) : () => promise.r()
  const generator = generatorFunction()
  const resume_ = (lastVal?: TNext): void => {
    const yielded = generator.next(lastVal), value = yielded.value
    if (Build.MinCVer < BrowserVer.Min$resolve$Promise$MeansThen) {
      Promise.resolve(value).then((yielded.done ? promise.r : resume_) as (value: TReturn | TNext) => void
          , Build.NDEBUG ? resolveVoid : logDebugAndResolve)
    } else if (yielded.done) {
      promise.r(value as TReturn | Promise<TReturn> as /** just to satisfy type checks */ TReturn)
    } else {
      Promise.resolve(value as TNext | Promise<TNext>).then(resume_, Build.NDEBUG ? resolveVoid : logDebugAndResolve)
    }
  }
  resume_()
  return promise.p
  function logDebugAndResolve(err: any): void {
    console.log("Vimium C: an async function fails:", err)
    resolveVoid()
  }
}
: 0 as never : 0 as never

const __awaiter = Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredES2017AsyncFunctions
? (_aw_self: void | 0 | undefined, _aw_args: unknown, _aw_p: PromiseConstructor | 0 | undefined
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    , func_to_await: Function): Promise<YieldedValue> => __myAwaiter(func_to_await as any)
: 0 as never

export { __generator as __asyncGenerator, __awaiter as __asyncAwaiter }

export const catchAsyncErrorSilently = <T> (__pFromAsync: Promise<T>): Promise<T | void> =>
    Build.NDEBUG ? __pFromAsync : OnChrome && Build.MinCVer < BrowserVer.MinEnsuredES2017AsyncFunctions ? __pFromAsync
    : __pFromAsync.catch(e => { console.log("Vimium C: unexpected error\n", e) })

/** sync dispatchers */

const mouse_ = function (element: SafeElementForMouse
    , type: kMouseClickEvents | kMouseEventsNotBubble | kMouseMoveEvents
    , center: Point2D, modifiers?: MyMouseControlKeys | null, relatedTarget?: NullableSafeElForM | 0
    , button?: AcceptableClickButtons, isTouch?: BOOL, forceToBubble?: boolean | BOOL): Promise<boolean> {
  const doc1 = element.ownerDocument as Document, view = doc1.defaultView || window,
  tyKey = type.slice(5, 6),
  // is: down | up | (click) | dblclick | auxclick
  detail = !"dui".includes(tyKey) || button === kClickButton.auxiliary && tyKey === "u" ? 0
      : button! & kClickButton.primaryAndTwice ? 2 : 1,
  cancelable = tyKey !== "e" && tyKey !== "l", // not (enter | leave)
  x = center[0], y = center[1],
  altKey = modifiers ? modifiers[0] : !1, ctrlKey = modifiers ? modifiers[1] : !1,
  metaKey = modifiers ? modifiers[2] : !1, shiftKey = modifiers ? modifiers[3] : !1
  button = (button! & (kClickButton.primaryAndTwice - 1)
      ) as kClickButton.none | kClickButton.auxiliary | kClickButton.second
  relatedTarget = relatedTarget && relatedTarget.ownerDocument === doc1 ? relatedTarget : null
  let mouseEvent: MouseEvent
  // note: there seems no way to get correct screenX/Y of an element
  if (!OnChrome || Build.MinCVer >= BrowserVer.MinUsable$MouseEvent$$constructor
      || chromeVer_ > BrowserVer.MinUsable$MouseEvent$$constructor - 1) {
    // Note: The `composed` here may require Shadow DOM support
    const init: ValidMouseEventInit & Partial<Omit<PointerEventInit, keyof MouseEventInit>> = {
      bubbles: cancelable || !!forceToBubble, cancelable,
      composed: OnChrome && Build.MinCVer < BrowserVer.MinMouseenter$composed$IsFalse
          && chromeVer_ < BrowserVer.MinMouseenter$composed$IsFalse || cancelable,
      view, detail,
      screenX: x, screenY: y, clientX: x, clientY: y, ctrlKey, altKey, shiftKey, metaKey,
      button, buttons: tyKey === "d" ? button - 1 ? button || 1 : 4 : 0,
      relatedTarget
    }
    OnChrome && setupIDC_cr!(init)
    if (OnChrome && (Build.MinCVer >= BrowserVer.MinEnsuredPointerEventForRealClick
          || chromeVer_ > BrowserVer.MinEnsuredPointerEventForRealClick - 1)
        && "ac".includes(type[0])) {
      init.pointerId = 1, init.pointerType = isTouch ? "touch" : "mouse"
      mouseEvent = new PointerEvent(type, init)
    } else {
      mouseEvent = new MouseEvent(type, init)
    }
  } else {
    mouseEvent = doc1.createEvent("MouseEvents")
    mouseEvent.initMouseEvent(type, !!forceToBubble || cancelable, cancelable
        , view, detail, x, y, x, y, ctrlKey, altKey, shiftKey, metaKey, button, relatedTarget)
  }
  if (OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinPopupBlockerPassOrdinaryClicksDuringExtMessages
      && clickEventToPrevent_) { // must be a click event
    return dispatchAndBlockClickOnce_old_ff(element, mouseEvent)
  }
  return dispatchAsync_(element, mouseEvent)
} as {
  (element: SafeElementForMouse, type: kMouseClickEvents, center: Point2D
    , modifiers?: MyMouseControlKeys | null, related?: NullableSafeElForM | 0, button?: AcceptableClickButtons
    , isTouch?: BOOL): Promise<boolean>
  (element: SafeElementForMouse, type: kMouseEventsNotBubble, center: Point2D, modifiers?: null
    , related?: NullableSafeElForM | 0, button?: kClickButton.none, isTouch?: 0, forceToBubble?: boolean|BOOL
    ): Promise<boolean>
  (element: SafeElementForMouse, type: kMouseMoveEvents, center: Point2D
    , modifiers?: null, related?: NullableSafeElForM): Promise<boolean>
}

export const setupIDC_cr = OnChrome ? (init: UIEventInit): void => {
  const IDC = Build.MinCVer < BrowserVer.MinEnsured$InputDeviceCapabilities ? InputDeviceCapabilities : null
  if (Build.MinCVer >= BrowserVer.MinEnsured$InputDeviceCapabilities || IDC) {
    init.sourceCapabilities = evIDC_cr = evIDC_cr || new (Build.MinCVer < BrowserVer.MinEnsured$InputDeviceCapabilities
        ? IDC : InputDeviceCapabilities)!({fireTouchEvents: !1})
  }
} : 0 as never as null

export const touch_cr_ = OnChrome ? (element: SafeElementForMouse, [x, y]: Point2D, end?: number): Promise<unknown> => {
  const touchObj = new Touch({
    identifier: 99, target: element,
    clientX: x, clientY: y,
    screenX: x, screenY: y,
    pageX: x + scrollX, pageY: y + scrollY,
    radiusX: 8, radiusY: 8, force: 1
  }), touches = end ? [] : [touchObj],
  touchEvent = newEvent_(end ? "touchend" : "touchstart"
      , Build.MinCVer >= BrowserVer.MinEnsuredTouchEventIsNotCancelable ? 1
        : chromeVer_ > BrowserVer.MinEnsuredTouchEventIsNotCancelable - 1, 0, 0, {
    touches, targetTouches: touches,
    changedTouches: [touchObj]
  }, TouchEvent)
  return dispatchAsync_(element, touchEvent)
} : 0 as never as null

/** async dispatchers */

/** note: will NOT skip even if newEl == @lastHovered */
export const hover_async = (async (newEl?: NullableSafeElForM
    , center?: Point2D, doesFocus?: boolean): Promise<void> => {
  // if center is affected by zoom / transform, then still dispatch mousemove
  let elFromPoint = elFromPoint_(center, newEl),
  canDispatchMove: boolean = !newEl || elFromPoint === newEl || !elFromPoint || !IsInDOM_(newEl, elFromPoint),
  last = derefInDoc_(lastHovered_), forceToBubble = lastBubbledHovered_ === lastHovered_,
  N = lastHovered_ = lastBubbledHovered_ = null
  const notSame = newEl !== last
  if (last) {
    // MS Edge 90 dispatches mouseout and mouseleave if only a target element is in doc
    await mouse_(last, "mouseout", [0, 0], N, notSame ? newEl : N)
    if ((!newEl || notSame && !IsInDOM_(newEl, last, 1)) && IsInDOM_(last, doc)) {
      await mouse_(last, "mouseleave", [0,0],N,newEl,kClickButton.none, 0, forceToBubble || enableBubblesForEnterLeave_)
      if (doesFocus && IsInDOM_(last)) { // always blur even when moved to another document
        blur_unsafe(last)
      }
    }
    last = notSame ? last : N
    await 0 // should keep function effects stable - not related to what `newEl` is
  } else {
    last = N
  }
  if (newEl && IsInDOM_(newEl)) {
    // then center is not null
    await mouse_(newEl, "mouseover", center!, N, last)
    if (IsInDOM_(newEl)) {
      await mouse_(newEl, "mouseenter", center!, N, last, kClickButton.none, 0, enableBubblesForEnterLeave_)
      if (canDispatchMove && IsInDOM_(newEl)) {
        await mouse_(newEl, "mousemove", center!)
      }
      lastHovered_ = IsInDOM_(newEl) ? OnFirefox ? weakRef_ff(newEl, kElRef.lastHovered) : weakRef_not_ff!(newEl) : N
      lastBubbledHovered_ = enableBubblesForEnterLeave_ && lastHovered_
      notSame && doesFocus && lastHovered_ && await dispatchAsync_(newEl, 0, 2)
    }
  }
  // here always ensure lastHovered_ is "in DOM" or null
}) as {
  <T extends 1 = 1> (newEl: SafeElementForMouse, center: Point2D, focus?: boolean): Promise<void>
  (newEl?: null): Promise<void>
}

export const unhover_async = (!OnChrome || Build.MinCVer >= BrowserVer.MinEnsuredGeneratorFunction
? async (element?: NullableSafeElForM): Promise<void> => {
  const old = derefInDoc_(lastHovered_), active = element || old
  if (old !== (element || null)) {
    await hover_async()
  }
  lastHovered_ = OnFirefox ? weakRef_ff(element, kElRef.lastHovered) : weakRef_not_ff!(element)
  await hover_async()
  blur_unsafe(active)
}
: (el?: NullableSafeElForM, step?: 1 | 2, old?: NullableSafeElForM): Promise<void | false> | void | false => {
  if (!step) {
    old = derefInDoc_(lastHovered_)
    return Promise.resolve<void | false>(old !== el && hover_async()).then(unhover_async
        .bind<void, NullableSafeElForM, 1, NullableSafeElForM, [], Promise<void | false>>(0, el, 1, el || old))
  } else if (step < 2) {
    lastHovered_ = OnFirefox ? weakRef_ff(el, kElRef.lastHovered) : weakRef_not_ff!(el)
    return hover_async().then(unhover_async.bind<0, NullableSafeElForM, 2, [], void | false>(0, old, 2))
  } else {
    return blur_unsafe(el)
  }
}) as {
  <T extends 1 = 1> (element?: NullableSafeElForM, step?: undefined, active?: undefined): Promise<void | false>
  (element: NullableSafeElForM, step: 1, active: NullableSafeElForM): Promise<void | false>
  (element: NullableSafeElForM, step: 2): /* all false values */ void | false
}

export const wrap_enable_bubbles = (<Func extends (...a: any[]) => Promise<unknown>> (opts: {bubbles?: boolean} | null
    , func: Func, args: Func extends () => void ? undefined : Parameters<Func>): ReturnType<Func> => {
  const bubbles = opts && opts.bubbles && (enableBubblesForEnterLeave_ = 1), p = func.apply(0, args || [])
  return (bubbles ? p.then(val => (enableBubblesForEnterLeave_ = 0, val)) : p) as ReturnType<Func>
}) as {
  <Res> (options: {bubbles?: boolean}, func: () => Promise<Res>): Promise<Res>
  <Func extends (...Args: any[]) => Promise<unknown>> (options: {bubbles?: boolean} | null
    , func: Func, args: Parameters<Func>): ReturnType<Func>
}

/** if `addFocus`, then `element` must has `.focus` */
export const click_async = (async (element: SafeElementForMouse
    , rect?: Rect | null, addFocus?: boolean | BOOL, modifiers?: MyMouseControlKeys
    , action?: kClickAction, button?: AcceptableClickButtons
    , /** default: false */ touchMode?: null | false | /** false */ 0 | true | "auto"): Promise<void | 1> => {
  /**
   * for important events including `mousedown`, `mouseup`, `click` and `dblclick`, wait for two micro tasks;
   * for other events, just wait for one micro task
   */
  if (OnEdge) {
    if ((element as Partial<HTMLInputElement /* |HTMLSelectElement|HTMLButtonElement */>).disabled) {
      return
    }
  }
  const kMenu = "contextmenu"
  const userOptions = isHintsActive && !((hintManager || coreHints).$().k.c as any[] | undefined) ? hintOptions : null
  const xy = userOptions && userOptions.xy as HintsNS.StdXY | undefined
      || button === kClickButton.second && userOptions![kMenu] !== !1 && { x: 20, y: -4 } as HintsNS.StdXY || null
  const center = center_(rect || (rect = getVisibleClientRect_(element)), xy)
  const sedIf = userOptions && userOptions.sedIf
  let result: ActionType = max_((action = action! | 0) - kClickAction.BaseMayInteract, 0)
  const initialStat = result & ActionType.interact && result < ActionType.MinOpenUrl
      ? result & ActionType.dblClick ? hasTag_("video", element) && fullscreenEl_unsafe_()
        : (element as HTMLMediaElement).paused : 0
  let isTouch: BOOL = 0
  if (OnFirefox && (Build.MinFFVer >= FirefoxBrowserVer.MinPopupBlockerPassOrdinaryClicksDuringExtMessages
      || firefoxVer_ > FirefoxBrowserVer.MinPopupBlockerPassOrdinaryClicksDuringExtMessages - 1)) {
    const promise = promiseDefer_<unknown>()
    send_(kFgReq.blank, 0, promise.r)
    await promise.p
    if (!IsInDOM_(element)) { return }
  }
  if (OnChrome && (Build.MinCVer >= BrowserVer.MinEnsuredTouchEventConstructor
          || chromeVer_ > BrowserVer.MinEnsuredTouchEventConstructor - 1)
      && (touchMode === !0 || touchMode && isInTouchMode_cr_!())) {
    await touch_cr_!(element, center)
    if (IsInDOM_(element)) {
      await touch_cr_!(element, center, 1)
    }
    isTouch = 1
    if (!IsInDOM_(element)) { return }
  }
  if (element !== deref_(lastHovered_)) {
    await wrap_enable_bubbles(userOptions, hover_async as typeof hover_async<1>, [element, center])
    if (!lastHovered_) { return }
  }
  if (OnFirefox) {
    // https://bugzilla.mozilla.org/show_bug.cgi?id=329509 says this starts on FF65,
    // but tests also confirmed it on Firefox 63.0.3 x64, Win10
    if ((element as Partial<HTMLInputElement /* |HTMLSelectElement|HTMLButtonElement */>).disabled) {
      return
    }
  }
  const mousedownNotPrevented = await mouse_(element, MDW, center, modifiers, 0, button)
  await 0
  if (!IsInDOM_(element)) { return }
  // Note: here we can check doc.activeEl only when @click is used on the current focused document
  if (addFocus && mousedownNotPrevented && element !== (getRootNode_mounted(element) as Document).activeElement
      && !(element as Partial<HTMLInputElement>).disabled) {
    await dispatchAsync_(element, 0, 2)
    if (!IsInDOM_(element)) { return }
    await 0
  }
  await mouse_(element, "mouseup", center, modifiers, 0, button)
  await 0
  if (!IsInDOM_(element) || button! & kClickButton.auxiliary) { return }
  if (button! & kClickButton.second) {
    // if button is the right, then auxclick can be triggered even if element.disabled
    OnEdge || OnChrome && Build.MinCVer < BrowserVer.MinEnsured$auxclick && chromeVer_ < BrowserVer.MinEnsured$auxclick
          && !("onauxclick" in HTMLElementProto!)
        || await mouse_(element, "auxclick", center, modifiers, 0, button, isTouch)
    await mouse_(element, kMenu, center, modifiers, 0, button, isTouch)
    return
  }
  if (OnChrome && (element as Partial<HTMLInputElement /* |HTMLSelectElement|HTMLButtonElement */>).disabled) {
    return
  }
  let url: string | null
  let parentAnchor: HTMLAnchorElement & SafeHTMLElement | null, sedIfRe: RegExpOne | void
  if (!result && (action || sedIf) && (parentAnchor = findAnchor_(element))
      && (url = attr_s(parentAnchor as SafeElement, "href"))
      && !(OnFirefox && parentAnchor.href.startsWith("file:") || url[0] === "#")) {
    // for forceToDblclick, element can be OtherSafeElement; for [1..BaseMayInteract), element must be in <html:a>
    result = sedIf && (sedIfRe = tryCreateRegExp(sedIf)) && sedIfRe.test(parentAnchor.href)
          ? ActionType.OpenTabButNotDispatch
        : isJSUrl(url) || (OnFirefox ? !action : action < kClickAction.MaxPlain + 1) ? ActionType.OnlyDispatch
        : !OnFirefox || action > kClickAction.MaxPlain ? ActionType.OpenTabButNotDispatch
        : // requires MinPopupBlockerPassOrdinaryClicksDuringExtMessages == MinPopupBlockerPassUntrustedComposedClicks
          Build.MinFFVer < FirefoxBrowserVer.MinPopupBlockerPassOrdinaryClicksDuringExtMessages
          && firefoxVer_ < FirefoxBrowserVer.MinPopupBlockerPassOrdinaryClicksDuringExtMessages
          && (action < kClickAction.plainMayOpenManually + 1 ? parentAnchor.target === "_blank"
              : Build.MinFFVer > FirefoxBrowserVer.ESRPopupBlockerPassClicksFromExtensions
                || firefoxVer_ - FirefoxBrowserVer.ESRPopupBlockerPassClicksFromExtensions || fgCache.V < 6)
        ? ActionType.DispatchAndMayOpenTab : ActionType.OnlyDispatch
  } else if (!result && getEditableType_<0>(element) === EditableType.Select) {
    result = ActionType.dblClick | ActionType.isSelect
  }
  const isCommonClick = result < ActionType.OpenTabButNotDispatch && button !== kClickButton.primaryAndTwice
      && !(modifiers && modifiers[0])
  isCommonClick && setNewScrolling(element) // DOMActivate is not triggered if a click event is cancelled (prevented)
  if ((result > ActionType.OpenTabButNotDispatch - 1
        || (OnFirefox && Build.MinFFVer < FirefoxBrowserVer.MinPopupBlockerPassOrdinaryClicksDuringExtMessages
            && /*#__INLINE__*/ prepareToBlockClick_old_ff(result === ActionType.DispatchAndMayOpenTab
                , action < kClickAction.plainMayOpenManually + 1 && parentAnchor!),
            (await await mouse_(element, CLK, center, modifiers, 0, button, isTouch)) && result
              || result & ActionType.dblClick))
      && getVisibleClientRect_(element)) {
    // require element is still visible
    isCommonClick && set_cachedScrollable(currentScrolling)
    if (result < ActionType.MinOpenUrl) {
      if (result & ActionType.dblClick && result < (ActionType.interact | ActionType.dblClick) + 1
          && !(element as Partial<HTMLInputElement /* |HTMLSelectElement|HTMLButtonElement */>).disabled
          && (// use old rect
            await click_async(element, rect, 0, modifiers, kClickAction.none, kClickButton.primaryAndTwice),
            !getVisibleClientRect_(element)
            || !await await mouse_(element, "dblclick", center, modifiers, 0, kClickButton.primaryAndTwice)
            || !getVisibleClientRect_(element)
          )) {
        /* empty */
      } else if (result & ActionType.interact) {
        if (result & ActionType.dblClick) {
          if (initialStat !== !1 && initialStat === fullscreenEl_unsafe_()) {
            if ((!OnChrome ? !OnFirefox || element.requestFullscreen
                  : Build.MinCVer >= BrowserVer.MinEnsured$Document$$fullscreenElement
                    || chromeVer_ > BrowserVer.MinEnsured$Document$$fullscreenElement - 1)) {
              initialStat ? doc.exitFullscreen() : element.requestFullscreen()
            } else {
              initialStat ? OnFirefox ? doc.mozCancelFullScreen() : doc.webkitExitFullscreen()
              : OnFirefox ? element.mozRequestFullScreen() : element.webkitRequestFullscreen()
            }
          }
        } else {
          (element as SafeHTMLElement as HTMLMediaElement).paused !== initialStat ? 0
              : initialStat ? (element as SafeHTMLElement as HTMLMediaElement).play()
              : (element as SafeHTMLElement as HTMLMediaElement).pause()
        }
      } else if (result & ActionType.isSelect) {
        showPicker_(element as SafeElement, EditableType.Select)
      }
      return
    }
    // use latest attributes ; now result > 0, so hintOptions and specialAction exists
    /** ignore {@link #BrowserVer.Min$TargetIsBlank$Implies$Noopener}, since C91 and FF88 always set openerTabId */
    (hintApi ? hintApi.p : post_)({
      H: kFgReq.openUrl, u: parentAnchor!.href, f: !0, o: userOptions && parseOpenPageUrlOptions(userOptions),
      r: action === kClickAction.plainInNewWindow ? ReuseType.newWnd
        : action > kClickAction.forceToOpenInCurrent - 1 || !action ? ReuseType.current
        : (action === kClickAction.forceToOpenInLastWnd ? ReuseType.OFFSET_LAST_WINDOW : 0)
          + ((hintMode1_ & HintMode.newtab_n_active) - HintMode.newTab ? ReuseType.newFg : ReuseType.newBg)
    })
    return 1
  }
}) as {
  (element: SafeElementForMouse
    , rect: Rect | null | undefined, addFocus: boolean | BOOL, modifiers: MyMouseControlKeys
    , specialAction: kClickAction, button: AcceptableClickButtons
    , /** default: false */ touchMode: null | undefined | false | /** false */ 0 | true | "auto"): Promise<void | 1>
  (element: SafeElementForMouse
    , rect: Rect | null, addFocus: boolean | BOOL, modifiers: MyMouseControlKeys | undefined
    , specialAction: kClickAction.none, button: kClickButton.primaryAndTwice): Promise<void | 1>
  (element: SafeElementForMouse
    , rect?: Rect | null, addFocus?: boolean | BOOL, useAltKey?: [true, false, false, false]): Promise<void | 1>
}

export const select_ = (element: LockableElement, rect?: Rect | null, show_flash?: boolean
    , action?: SelectActions, suppressRepeated?: boolean): Promise<void> => {
  const y = scrollY
  const sel = getEditableType_<0>(element) == EditableType.ContentEditable && getSelected()
  const range = sel && selRange_(sel)
  const focusedRange = range && range.cloneRange()
  const focusedRect = focusedRange && getSelectionBoundingBox_(focusedRange.collapse(!1), 0, focusedRange)
  return catchAsyncErrorSilently(click_async(element
      , focusedRect && (!rect || isContaining_(rect, focusedRect)) ? focusedRect : rect, 1)).then((): void => {
    view_(element, !show_flash, y)
    // re-compute rect of element, in case that an input is resized when focused
    show_flash && flash_(element)
    if (element !== insert_Lock_()) { return }
    // then `element` is always safe
    if (Build.NDEBUG) {
      safeCall(/*#__INLINE__*/ moveSel_s_throwable, element, action)
    } else {
      try {
        moveSel_s_throwable(element, action)
      } catch (e) {
        console.log("Vimium C: failed in moving caret.", e)
      }
    }
    if (suppressRepeated) { suppressTail_() }
  })
}

if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredGeneratorFunction) {
  if (!(Build.NDEBUG || (<RegExpOne> /\.label_\b/).test(click_async + ""))) {
    alert("Assert error: async functions should have used `label_` and `sent_`")
  }
}
if (Build.BTypes & BrowserType.Chrome && Build.MinCVer < BrowserVer.MinEnsuredGeneratorFunction
    && Build.BTypes & BrowserType.Firefox) {
  const error = "Assert error: Vimium C for Firefox requires `async`, so doesn't work on Chrome " + Build.MinCVer
  if (Build.NDEBUG) {
    alert(error)
  } else {
    console.error(error)
    if (OnFirefox) {
      Object.assign(typeof globalThis !== "undefined" ? globalThis : window as any, { __generator, __awaiter })
    }
  }
}
