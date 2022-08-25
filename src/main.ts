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

    this.matrixElem.addEventListener('pointercancel', (e: PointerEvent) => {
      this._handlePixelInteraction((e.target as HTMLDivElement))
      e.preventDefault()


    })

    this.colorPickerElem.addEventListener('change', (e: Event) => {
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

  private _draw(elem: HTMLElement, x: number, y: number) {
    this.initiatingAction = PaintAction.DRAWING

    this._paintElem(elem)
    this._addCoordsToMap(x, y)
    this.lastDrawnOn = `${x},${y}`
  }
  
  private _erase(elem: HTMLElement, x: number, y: number) {
    this.initiatingAction = PaintAction.ERASING
    
    this._clearElem(elem)
    this._removeCoordsFromMap(x, y)
    this.lastErasedOn = `${x},${y}`
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
  }

}

new PixelDraw(16)