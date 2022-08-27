import { serialHandler } from './serial-handler.js'

enum PaintAction {
  "DRAWING",
  "ERASING",
} 
export class PixelDraw {
  initiatingAction: PaintAction | undefined
  lastDrawnOn = ''
  lastErasedOn = ''
  draggingPointer = false
  colorPickerElem: HTMLInputElement = <HTMLInputElement>document.querySelector("#color-picker")
  matrixElem: HTMLDivElement = <HTMLDivElement>document.querySelector(".matrix")
  clearBtnElem: HTMLButtonElement = <HTMLButtonElement>document.querySelector("#clear-matrix")
  connectBtnElem: HTMLButtonElement = <HTMLButtonElement>document.querySelector("#connect-matrix")
  matrixSideLength: number
  currentDrawing = new Map()
  selectedColor: string = this.colorPickerElem.value

  constructor(matrixSideLength: number) {
    this.matrixSideLength = matrixSideLength
    this._createListeners()
    this._generateMatrix(this.matrixSideLength)
  }

  private _createListeners() {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && ["BUTTON", "INPUT"].indexOf((e.target as HTMLElement).tagName) === -1) {
        e.preventDefault()
        this._handlePixelInteraction(<HTMLDivElement>e.target)
      }
    })

    this.matrixElem.addEventListener('pointerdown', (e: PointerEvent) => {
      e.preventDefault()
      this._handlePixelInteraction((e.target as HTMLDivElement))
    })

    this.connectBtnElem.addEventListener('pointerdown', async (e: PointerEvent) => {
      e.preventDefault()
      await serialHandler.init()
    })

    this.matrixElem.addEventListener('pointerup', () => {
      if (this.draggingPointer) {
        this.draggingPointer = false
      }
      this.initiatingAction = undefined
    })

    this.matrixElem.addEventListener('pointermove', (e: PointerEvent) => {
      if (e.buttons === 1) {
        this.draggingPointer = true
        this._handlePixelInteraction((e.target as HTMLDivElement))
      }
    })
    
    this.colorPickerElem.addEventListener('input', (e: Event) => {
      this.selectedColor = (e.target as HTMLInputElement).value
    })

    this.clearBtnElem.addEventListener('pointerdown', () => {
      this._clearMatrix()
    })
  }

  private _generateMatrix(sideLength: number) {
    let matrixElemInnerHTML = ''
    const iteratorArr = new Array(sideLength).fill('')
    for (let i in iteratorArr) {
      for (let j in iteratorArr) {
        const isPartOfDrawning = this.currentDrawing.get(`${i},${j}`) // the color for that coordinate || undefined
        matrixElemInnerHTML += `
          <div
            class="pixel"
            tabindex="0"
            role="gridcell"
            draggable="false"
            data-coords="${i},${j}"
            aria-colindex="${i}"
            aria-rowindex="${j}"
            style="background-color: ${isPartOfDrawning || ''}"}
          ></div>
        `
      }
    }

    this.matrixElem.innerHTML = matrixElemInnerHTML
    this.matrixElem.setAttribute('aria-colcount', this.matrixSideLength)
  }

  private _handlePixelInteraction(elem: HTMLElement) {
    const coordsString = elem.dataset['coords']
    if (!coordsString) {
      return
    }
    const [coordsX, coordsY] = [...coordsString.split(',')]
    const elementPreviousColor = this.currentDrawing.get(coordsString)
    if (this.draggingPointer) {
      if (`${coordsX},${coordsY}` === this.lastDrawnOn || `${coordsX},${coordsY}` === this.lastErasedOn) {
        return
      } else {
        // make sure the element has been drawn on before
        if (this.initiatingAction === PaintAction.ERASING && elementPreviousColor) {
          this._erase(elem, +coordsX, +coordsY)
        } else if (this.initiatingAction === PaintAction.DRAWING) {
          this._draw(elem, +coordsX, +coordsY)
        }
      }

    } else { // regular pointer action
      if (this.currentDrawing.has(coordsString)) {
        if (elementPreviousColor === this.selectedColor) {
          this._erase(elem, +coordsX, +coordsY)
        } else {
          this._draw(elem, +coordsX, +coordsY)
        }
      } else {
        this._draw(elem, +coordsX, +coordsY)
      }

    }
  }

  private async _draw(elem: HTMLElement, x: number, y: number) {
    this.initiatingAction = PaintAction.DRAWING

    this._paintElem(elem)
    this._addCoordsToMap(x, y)
    this.lastDrawnOn = `${x},${y}`
    const data = [1, this.getPixelNumber(x, y), ...this.hexToRgb(this.selectedColor)]
    
    serialHandler.write(JSON.stringify(data))
  }
  
  private _erase(elem: HTMLElement, x: number, y: number) {
    this.initiatingAction = PaintAction.ERASING
    
    this._clearElem(elem)
    this._removeCoordsFromMap(x, y)
    this.lastErasedOn = `${x},${y}`

    const data = [0, this.getPixelNumber(x, y), 0, 0, 0]
    
    serialHandler.write(JSON.stringify(data))
  }

  private _paintElem(elem: HTMLElement) {
    elem.style.backgroundColor = this.colorPickerElem.value
  }
  
  private _clearElem(elem: HTMLElement) {
    elem.style.removeProperty('background-color')
  }

  private _addCoordsToMap(x: number, y: number) {
    this.currentDrawing.set(`${x},${y}`, this.colorPickerElem.value)
  }

  private _removeCoordsFromMap(x: number, y: number) {
    this.currentDrawing.delete(`${x},${y}`)
  }

  private _clearMatrix() {
    this.currentDrawing = new Map()
    this._generateMatrix(this.matrixSideLength)
    serialHandler.write(JSON.stringify([2,0,0,0]))
  }

  private getPixelNumber(x: number, y: number) {
    if (x % 2 === 0) {
      return (this.matrixSideLength * x) + (15 - y)
    } else {
      return (this.matrixSideLength * x) + y 
    }
  }
  
  hexToRgb(hex: string) {
    const hexVal = hex.charAt(0) === '#' ? hex.slice(1) : hex
    const arrBuffer = new ArrayBuffer(4)
    const dv = new DataView(arrBuffer)
    dv.setUint32(0, parseInt(hexVal, this.matrixSideLength) ,false)
    const arrByte = new Uint8Array(arrBuffer)
  
    return [arrByte[1],  arrByte[2], arrByte[3]]
  }
}

new PixelDraw(16)