import { useState, useRef, useEffect, ChangeEvent } from 'react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import confetti from 'canvas-confetti'
import { Menu, X, ArrowDownAZ, Shuffle } from 'lucide-react'

import { debounce, encodeBase64, decodeBase64, isChristmas } from '@/lib/utils'

const WheelOfNames = () => {
  const [names, setNames] = useState<string[]>([])
  const [wheels, setWheels] = useState<{ [key: string]: string[] }>({})
  const [selectedWheel, setSelectedWheel] = useState<string>('')
  const [showImportDialog, setShowImportDialog] = useState<boolean>(false)
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false)
  const [inputValue, setInputValue] = useState<string>('')
  const [isUserUpdated, setIsUserUpdated] = useState<boolean>(false)
  const [saveWheelInputValue, setSaveWheelInputValue] = useState<string>('')
  const [spinning, setSpinning] = useState<boolean>(false)
  const [selectedName, setSelectedName] = useState<string>('')
  const [showAlert, setShowAlert] = useState<boolean>(false)
  const [rotation, setRotation] = useState<number>(0)
  const [backgroundImage, setBackgroundImage] =
    useState<HTMLImageElement | null>(null)
  const [results, setResults] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string>('people')
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false)
  
  // Use relative paths for GitHub Pages
  const defaultImage = isChristmas ? './XMASWheelBackground.jpg' : './WheelBackground.jpg'
  const [backgroundImageUrl, setBackgroundImageUrl] =
    useState<string>(defaultImage)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [resultMessage, setResultMessage] = useState("{name}, you're up!")

  const wheelRef = useRef<HTMLCanvasElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const beepRef = useRef<HTMLAudioElement | null>(null)
  const isFirstSpin = useRef<boolean>(true)
  const previousSliceIndex = useRef<number | null>(null)
  const lastPlayedAudioIndex = useRef<number | null>(null)

  useEffect(() => {
    // Load all saved data from local storage
    const savedInputValue = localStorage.getItem('wheelOfNamesInput')
    const savedBgImageUrl = localStorage.getItem('wheelOfNamesBgImage')
    const savedResultMessage = localStorage.getItem('wheelOfNamesResultMessage')
    const savedWheels = localStorage.getItem('savedWheels')
    const userUpdatedFlag = localStorage.getItem('isUserUpdated') === 'true'

    // Load saved wheels from local storage
    if (savedWheels) {
      setWheels(JSON.parse(savedWheels))
    }

    // Check for input data in URL if the user hasn't updated the names
    if (!userUpdatedFlag) {
      const urlParams = new URLSearchParams(window.location.search)
      const inputData = urlParams.get('input')
      if (inputData) {
        const decodedInputValue = decodeBase64(inputData)
        setInputValue(decodedInputValue)
        const newNames = decodedInputValue
          .split('\n')
          .filter((name) => name.trim() !== '')
        setNames(newNames)

        // Clear URL parameters
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        )
      } else if (savedInputValue) {
        setInputValue(savedInputValue)
        const newNames = savedInputValue
          .split('\n')
          .filter((name) => name.trim() !== '')
        setNames(newNames)
      } else {
        // Set default names if no saved input value is found
        const defaultNames = 'John\nPaul\nGeorge\nRingo'
        setInputValue(defaultNames)
        const newNames = defaultNames
          .split('\n')
          .filter((name) => name.trim() !== '')
        setNames(newNames)
        localStorage.setItem('wheelOfNamesInput', defaultNames)
      }
    } else if (savedInputValue) {
      setInputValue(savedInputValue)
      const newNames = savedInputValue
        .split('\n')
        .filter((name) => name.trim() !== '')
      setNames(newNames)
    }

    if (savedBgImageUrl) {
      setBackgroundImageUrl(savedBgImageUrl)
      loadBackgroundImage(savedBgImageUrl)
    } else {
      loadBackgroundImage(backgroundImageUrl)
    }

    if (savedResultMessage) {
      setResultMessage(savedResultMessage)
    }

    // Start the slow spin
    startSlowSpin()

    // Handle resize
    const handleResize = () => {
      if (wheelRef.current) {
        const canvas = wheelRef.current
        canvas.width = canvas.offsetWidth
        canvas.height = canvas.offsetHeight
        drawWheel()
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize() // Initial call to set canvas size
    drawArrow()

    // Clean up function
    return () => {
      stopAnimation()
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    if (names.length > 0 && backgroundImage) {
      drawWheel()
    }
  }, [names, backgroundImage])
  
  useEffect(() => {
    if (names.length > 0 && backgroundImage) {
      drawWheel()
    }
  }, [names, rotation, backgroundImage])

  useEffect(() => {
    if (selectedWheel) {
      const wheelNames = wheels[selectedWheel] || []
      setNames(wheelNames)
      setInputValue(wheelNames.join('\n'))
      setSaveWheelInputValue(selectedWheel)
      localStorage.setItem('wheelOfNamesInput', wheelNames.join('\n'))
    }
  }, [selectedWheel])

  useEffect(() => {
    if (!showAlert) {
      if (!isFirstSpin.current) {
        startSlowSpin()
      }
    } else {
      stopAnimation()
    }
  }, [showAlert])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const loadBackgroundImage = (url: string) => {
    const img = new Image()
    img.src = url
    img.onload = () => setBackgroundImage(img)
  }

  const handleBackgroundImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setBackgroundImageUrl(base64String)
        localStorage.setItem('wheelOfNamesBgImage', base64String)
        loadBackgroundImage(base64String)
      }
      reader.readAsDataURL(file)
    }
  }

  const resetToDefaultBackground = () => {
    setBackgroundImageUrl('./WheelBackground.jpg')
    localStorage.removeItem('wheelOfNamesBgImage')
    loadBackgroundImage('./WheelBackground.jpg')
  }

  const handleResultMessageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newMessage = e.target.value
    setResultMessage(newMessage)
    localStorage.setItem('wheelOfNamesResultMessage', newMessage)
  }

  const resetResultMessage = () => {
    const defaultMessage = "{name}, you're up!"
    setResultMessage(defaultMessage)
    localStorage.setItem('wheelOfNamesResultMessage', defaultMessage)
  }

  const handleInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInputValue(value)
    const newNames = value.split('\n').filter((name) => name.trim() !== '')
    setNames(newNames)
    debouncedSaveToLocalStorage(value)
  }

  const handleSaveWheelInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSaveWheelInputValue(value)
  }

  const saveToLocalStorage = (value: string) => {
    localStorage.setItem('wheelOfNamesInput', value)
  }

  const saveWheelToLocalStorage = (value: string, names: string[]) => {
    const wheel = { [value]: names }
    const newWheels = { ...wheels, ...wheel }
    setWheels(newWheels)
    localStorage.setItem('savedWheels', JSON.stringify(newWheels))
  }

  const debouncedSaveToLocalStorage = debounce(saveToLocalStorage, 500)

  const getBackgroundBrightness = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const imageData = ctx.getImageData(width / 2, height / 2, 1, 1).data
    const r = imageData[0]
    const g = imageData[1]
    const b = imageData[2]

    return (r + g + b) / 3
  }

  const drawWheel = () => {
    const canvas = wheelRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 10

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.save()
    ctx.translate(centerX, centerY)
    ctx.rotate(rotation)

    if (backgroundImage) {
      ctx.save()
      ctx.beginPath()
      ctx.arc(0, 0, radius, 0, 2 * Math.PI)
      ctx.clip()

      const imgAspectRatio = backgroundImage.width / backgroundImage.height
      const canvasAspectRatio = canvas.width / canvas.height

      let drawWidth, drawHeight
      if (canvasAspectRatio > imgAspectRatio) {
        drawHeight = canvas.height
        drawWidth = drawHeight * imgAspectRatio
      } else {
        drawWidth = canvas.width
        drawHeight = drawWidth / imgAspectRatio
      }

      ctx.drawImage(
        backgroundImage,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      )
      ctx.restore()
    }

    // determine background brightness
    const brightness = getBackgroundBrightness(ctx, canvas.width, canvas.height)

    // stroke color based on brightness
    const strokeColor =
      brightness > 128 ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.4)'
    const lineWidth = 0.5

    const sliceAngle = (2 * Math.PI) / names.length
    let fontSize

    if (names.length >= 300) {
      fontSize = Math.min(canvas.width, canvas.height) / 100
    } else if (names.length >= 250) {
      fontSize = Math.min(canvas.width, canvas.height) / 90
    } else if (names.length >= 200) {
      fontSize = Math.min(canvas.width, canvas.height) / 80
    } else if (names.length >= 150) {
      fontSize = Math.min(canvas.width, canvas.height) / 70
    } else if (names.length >= 100) {
      fontSize = Math.min(canvas.width, canvas.height) / 60
    } else if (names.length >= 90) {
      fontSize = Math.min(canvas.width, canvas.height) / 55
    } else if (names.length >= 80) {
      fontSize = Math.min(canvas.width, canvas.height) / 50
    } else if (names.length >= 70) {
      fontSize = Math.min(canvas.width, canvas.height) / 45
    } else if (names.length >= 60) {
      fontSize = Math.min(canvas.width, canvas.height) / 40
    } else if (names.length >= 50) {
      fontSize = Math.min(canvas.width, canvas.height) / 35
    } else if (names.length >= 40) {
      fontSize = Math.min(canvas.width, canvas.height) / 30
    } else {
      fontSize = Math.min(canvas.width, canvas.height) / 20
    }

    names.forEach((name, index) => {
      const startAngle = index * sliceAngle
      const endAngle = startAngle + sliceAngle

      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, radius, startAngle, endAngle)
      ctx.closePath()

      ctx.strokeStyle = strokeColor
      ctx.lineWidth = lineWidth
      ctx.stroke()

      ctx.save()
      ctx.rotate(startAngle + sliceAngle / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = 'white'
      ctx.font = `${fontSize}px Poppins`
      ctx.lineWidth = 3
      ctx.strokeStyle = 'black'

      const formattedName = name
        .split(' ')
        .map(
          (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        )
        .join(' ')

      ctx.strokeText(formattedName, radius - 10, 0)
      ctx.fillText(formattedName, radius - 10, 0)
      ctx.restore()
    })

    ctx.restore()
  }

  const drawArrow = () => {
    const container = containerRef.current
    if (!container) return

    const arrowSize = 20
    const arrow = document.createElement('div')
    arrow.style.position = 'absolute'
    arrow.style.right = '0'
    arrow.style.top = '50%'
    arrow.style.width = '0'
    arrow.style.height = '0'
    arrow.style.borderTop = `${arrowSize}px solid transparent`
    arrow.style.borderBottom = `${arrowSize}px solid transparent`
    arrow.style.borderRight = `${arrowSize}px solid #dced48`
    arrow.style.transform = 'translateY(-50%)'

    container.appendChild(arrow)
  }

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

  const stopAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
  }

  const startSlowSpin = () => {
    const slowSpin = () => {
      setRotation((prevRotation) => prevRotation + 0.001)
      animationRef.current = requestAnimationFrame(slowSpin)
    }
    animationRef.current = requestAnimationFrame(slowSpin)
  }

  const spinWheel = () => {
    if (spinning) return

    setSpinning(true)
    stopAnimation()

    const totalSpins = 5
    const randomExtraRotation = Math.random() * 360
    const totalRotation = 360 * totalSpins + randomExtraRotation

    const duration = 6000
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutCubic(progress)
      const currentRotation = totalRotation * easedProgress
      const radiansRotation = (currentRotation * Math.PI) / 180

      setRotation(radiansRotation)

      const sliceAngle = 360 / names.length
      const currentSliceIndex = Math.floor(currentRotation / sliceAngle)

      if (previousSliceIndex.current !== currentSliceIndex) {
        if (beepRef.current) {
          beepRef.current.currentTime = 0
          beepRef.current.play()
        }
        previousSliceIndex.current = currentSliceIndex
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setSpinning(false)
        const finalRotation = currentRotation % 360
        const selectedIndex = Math.floor(
          (360 - finalRotation) / (360 / names.length)
        )
        const selected = names[selectedIndex]
        setSelectedName(selected)
        setResults((prevResults) => [...prevResults, selected])
        setShowAlert(true)
        showConfetti()
        playRandomAudio()
      }
    }

    animationRef.current = requestAnimationFrame(animate)
    isFirstSpin.current = false
  }

  const sortNamesAlphabetically = () => {
    const sortedNames = [...names].sort((a, b) => a.localeCompare(b))
    setNames(sortedNames)
    setInputValue(sortedNames.join('\n'))
    saveToLocalStorage(sortedNames.join('\n'))
  }

  const shuffleNames = () => {
    const shuffledNames = [...names].sort(() => Math.random() - 0.5)
    setNames(shuffledNames)
    setInputValue(shuffledNames.join('\n'))
    saveToLocalStorage(shuffledNames.join('\n'))
  }

  const showConfetti = () => {
    confetti({
      particleCount: 100,
      colors: ['#008000', '#FF0000'],
      spread: 70,
      origin: { y: 0.6 },
    })
    setTimeout(() => confetti.reset(), 3000)
  }

  const playRandomAudio = () => {
    let randomIndex
    let audioFiles

    if (isChristmas) {
      audioFiles = [
        './christmas/name1.mp3',
        './christmas/name2.mp3',
        './christmas/name3.mp3',
      ]
    } else {
      audioFiles = [
        './name1.mp3',
        './name2.mp3',
        './name3.mp3',
        './name4.mp3',
        './name5.mp3',
        './name6.mp3',
        './name7.mp3',
        './name8.mp3',
        './name9.mp3',
        './name10.mp3',
      ]
    }

    do {
      randomIndex = Math.floor(Math.random() * audioFiles.length)
    } while (randomIndex === lastPlayedAudioIndex.current)

    lastPlayedAudioIndex.current = randomIndex
    const audio = new Audio(audioFiles[randomIndex])
    audio.volume = 0.1
    audio.play()
  }

  const removeSelectedName = () => {
    const newNames = names.filter((name) => name !== selectedName)
    setNames(newNames)
    setInputValue(newNames.join('\n'))
    setShowAlert(false)
    saveToLocalStorage(newNames.join('\n'))
  }

  const commonTabContentStyle =
    'w-full h-64 p-2 rounded border bg-white resize-none overflow-y-auto outline-none'

  return (
    <div
      className={`relative h-screen ${
        isChristmas ? 'bg-[#800b00]' : 'bg-[#ebe8e3]'
      }`}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          ref={containerRef}
          className="relative w-full h-full max-w-[800px] max-h-[800px] aspect-square">
          <canvas
            ref={wheelRef}
            className="w-full h-full rounded-full cursor-pointer"
            style={{ backgroundColor: 'transparent' }}
            onClick={spinWheel}
          />
        </div>
      </div>

      <div
        className="absolute z-50 cursor-pointer top-4 right-4 lg:hidden"
        onClick={toggleMenu}>
        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </div>

      {/* mobile menu */}
      <div
        className={`fixed inset-y-0 right-0 w-64 pt-8 md:pt-0 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-40 ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        } lg:hidden`}>
        <div className="p-4 pt-14">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="people">People</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </TabsList>
            <TabsContent value="people">
              <div className="relative">
                <textarea
                  value={inputValue}
                  onChange={handleInputChange}
                  placeholder="Enter names (one per line)"
                  className={commonTabContentStyle}
                />
                <div className="absolute flex flex-col space-y-2 top-2 right-2">
                  <ArrowDownAZ
                    className="cursor-pointer text-[#495459]"
                    onClick={sortNamesAlphabetically}
                  />
                  <Shuffle
                    className="cursor-pointer text-[#495459]"
                    onClick={shuffleNames}
                  />
                </div>
              </div>
              <div className="flex justify-between flex-col gap-2 mt-[2px]">
                <Button
                  onClick={() => setShowSaveDialog(true)}
                  className="w-full">
                  Save
                </Button>
                <Button
                  onClick={() => setShowImportDialog(true)}
                  className="w-full">
                  Saved Wheels
                </Button>
                <Button
                  onClick={() => {
                    const encodedInputValue = encodeBase64(inputValue)
                    const shareableLink = `${window.location.origin}?input=${encodedInputValue}`
                    navigator.clipboard.writeText(shareableLink).then(() => {
                      alert('Shareable link copied to clipboard!')
                    })
                  }}>
                  Share
                </Button>
                <Button
                  onClick={() => {
                    setShowSettingsModal(true)
                    setIsMenuOpen(false)
                  }}>
                  Settings
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="results">
              <div className={commonTabContentStyle}>
                <ul className="p-0 m-0 list-none">
                  {results.map((result, index) => (
                    <li key={index} className="mb-1">
                      {result}
                    </li>
                  ))}
                </ul>
              </div>
              {results.length > 0 && (
                <div className="flex justify-between flex-col gap-2 mt-[2px]">
                  <Button
                    onClick={() => {
                      setResults([])
                    }}
                    className="mt-2">
                    Clear Results
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* desktop sidebar */}
      <div className="absolute right-0 top-[45%] transform -translate-y-1/2 lg:w-32 xl:w-64 p-2 h-[315px] hidden lg:block">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>
          <TabsContent value="people">
            <div className="relative">
              <textarea
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Enter names (one per line)"
                className={commonTabContentStyle}
              />
              <div className="absolute flex flex-col space-y-2 top-2 right-2">
                <ArrowDownAZ
                  className="cursor-pointer text-[#495459]"
                  onClick={sortNamesAlphabetically}
                />
                <Shuffle
                  className="cursor-pointer text-[#495459]"
                  onClick={shuffleNames}
                />
              </div>
            </div>
            <div className="flex justify-between flex-col gap-2 mt-[2px]">
              <Button
                onClick={() => setShowSaveDialog(true)}
                className="w-full">
                Save
              </Button>
              <Button
                onClick={() => setShowImportDialog(true)}
                className="w-full">
                Saved Wheels
              </Button>
              <Button
                onClick={() => {
                  const encodedInputValue = encodeBase64(inputValue)
                  const shareableLink = `${window.location.origin}?input=${encodedInputValue}`
                  navigator.clipboard.writeText(shareableLink).then(() => {
                    alert('Shareable link copied to clipboard!')
                  })
                }}>
                Share
              </Button>
              <Button
                onClick={() => {
                  setShowSettingsModal(true)
                  setIsMenuOpen(false)
                }}>
                Settings
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="results">
            <div className={commonTabContentStyle}>
              <ul className="p-0 m-0 list-none">
                {results.map((result, index) => (
                  <li key={index} className="mb-1">
                    {result}
                  </li>
                ))}
              </ul>
            </div>
            {results.length > 0 && (
              <div className="flex justify-between flex-col gap-2 mt-[2px]">
                <Button
                  onClick={() => {
                    setResults([])
                  }}
                  className="mt-2">
                  Clear Results
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <audio ref={beepRef} src="./beep.mp3" preload="auto" />
      {showAlert && (
        <AlertDialog
          open={showAlert}
          onOpenChange={(open) => {
            setShowAlert(open)
            if (!open) {
              startSlowSpin()
            }
          }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogDescription>
                The wheel has spoken
              </AlertDialogDescription>
              <AlertDialogTitle className="text-3xl">
                <strong>{resultMessage.replace('{name}', selectedName)}</strong>
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              {names.length > 1 && (
                <AlertDialogAction onClick={removeSelectedName}>
                  Remove
                </AlertDialogAction>
              )}
              <AlertDialogAction onClick={() => setShowAlert(false)}>
                OK
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label
                htmlFor="bgImageFile"
                className="block mb-2 text-sm font-medium text-gray-700">
                Select Background Image
              </label>
              <div className="flex items-center gap-1">
                <Input
                  id="bgImageFile"
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundImageChange}
                  className="w-full"
                />
                <Button
                  onClick={resetToDefaultBackground}
                  variant="outline"
                  className="w-half">
                  Reset
                </Button>
              </div>
            </div>
            <div>
              <label
                htmlFor="resultMessage"
                className="block mb-2 text-sm font-medium text-gray-700">
                Result Message
              </label>
              <div className="flex items-center gap-1">
                <Input
                  id="resultMessage"
                  type="text"
                  value={resultMessage}
                  onChange={handleResultMessageChange}
                  className="w-full"
                  placeholder="Enter result message"
                />
                <Button
                  onClick={resetResultMessage}
                  variant="outline"
                  className="w-half">
                  Reset
                </Button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Use {'{name}'} to insert the selected name
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSettingsModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save wheel</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-2">
            <Input
              id="saveWheelInput"
              value={saveWheelInputValue}
              type="text"
              onChange={handleSaveWheelInputChange}
              placeholder="Wheel name"
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowSaveDialog(false)
                saveWheelToLocalStorage(saveWheelInputValue, names)
              }}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Saved Wheels</DialogTitle>
          </DialogHeader>
          
          {Object.keys(wheels).length === 0 ? (
            <p className="text-sm text-gray-500">No saved wheels yet.</p>
          ) : (
            <div className="flex flex-col space-y-2">
              {Object.keys(wheels).map((wheel) => (
                <div key={wheel} className="flex items-center space-x-2">
                  <Button
                    className="w-full"
                    onClick={() => {
                      setSelectedWheel(wheel)
                      setShowImportDialog(false)
                    }}>
                    {wheel}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const newWheels = { ...wheels }
                      delete newWheels[wheel]
                      setWheels(newWheels)
                      localStorage.setItem(
                        'savedWheels',
                        JSON.stringify(newWheels)
                      )
                    }}>
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowImportDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default WheelOfNames