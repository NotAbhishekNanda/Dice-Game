const qsall = document.querySelectorAll.bind(document), //shortcut for document.querySelectorAll
    qs = document.querySelector.bind(document), //shortcut for document.querySelector
    
    gameSlides = [...qsall('.slide')],

    /* --- game's setting --- */
    playersQty = [...qsall('.choose-players-qty')],
    playerForm = qs('.players-identity'),
    avatars = [...qsall('.avatar-container .item-list .item')],
    myAvatar = qs('.my-avatar'),
    colors = [...qsall('.color-container .item-list .item')],
    myColor = [...qsall('.my-color')],
    playerColor = ['hsl(120deg, 100%, 80%)', 'hsl(270deg, 100%, 80%)'],

    /* --- game board / game variables --- */
    rollBtn = qs('.roll-button'),
    diceContainer = [...qsall('.dice-container')],
    playerContainer = [...qsall('.player-container')],
    playerScore = [...qsall('.player-score')],
    playerTotal = [...qsall('.player-total')],
    dice = [...qsall('.dice')],
    score = qs('.score'),
    rollMax = 8,
    goal = 1000,

    /* --- end of turn / game message displayed --- */
    messageModal = qs('.informations'),
    messageText = qs('.my-message'),
    presenter = qs('.presenter'),

    /* ------ options ------ */
    optionCheckbox = document.getElementById('option-checkbox'),

    /* --- sound n music --- */
    diceSound = new Audio('https://maxime-malfilatre.com/sandbox/sound/rollinDice.wav'),
    music = new Audio('https://maxime-malfilatre.com/sandbox/sound/music-dicegame.wav'),
    /* --- music options --- */
    audioSources = [music, diceSound],
    audioSliders = [document.getElementById('music'), document.getElementById('sound')],
    audioSymbols = [qs('.music-symbol'), qs('.sound-symbol')],
    audioMuted = [false, false],

    resetBtn = qs('.reset-button'),
    resetModal = qs('.reset')

let currentSlide = 0,
    playerQty = 0,
    playerTurn = 0,
    roundOver = false,
    gameOver = false,
    delay = 0, // set the delay before the message modal is displayed
    canRoll = true,
    cpuCanPlay = true,
    diceLocked = 0,
    rollOfThedice = 0,
    setOfdice = [],
    results = [],
    players = [],
    customRate = 0 // ratio sound duration, dice delay


function MyDice(id) {
    this.id = id
    this.value = 1
    this.delay = 0
    this.locked = false
    this.angleX = 0
    this.angleY = 0
}

function Player(id, name) {
    this.id = id
    this.name = name
    this.score = 0
    this.total = goal
    this.gameWon = 0
}

const changeSlide = () => {
    gameSlides[currentSlide].style.opacity = 0
    currentSlide++
    gameSlides[currentSlide].style.opacity = 1
    gameSlides[currentSlide].style.display = "grid"
}

playersQty.forEach(btn => btn.addEventListener('click', () => {
    playerQty = parseInt(btn.dataset.qty)
    changeSlide()
}))


// choose the color

myColor.forEach(color => color.addEventListener('click', () => {
    qs('.color-container').style.transform = "scale(1)"
})
)

colors.forEach(color => {
    color.addEventListener('click', ({ target }) => colorChosen(target))
})

const colorChosen = (colorClicked) => {
    console.log('click', playerTurn)

    playerColor[playerTurn] = colorClicked.dataset.color

    colors.forEach(col => col.classList.remove('selected'))

    colorClicked.classList.add('selected')

    document.documentElement.style.setProperty('--player' + (playerTurn + 1) + '-color', colorClicked.dataset.color)

    playerTurn === 0 && document.documentElement.style.setProperty('--current-player-color', colorClicked.dataset.color)

    qs('.color-container').style.transform = "scale(0)"
}

// choose the avatar

myAvatar.addEventListener('click', () => {
    qs('.avatar-container').style.transform = "scale(1)"
})

avatars.forEach(avatar => {
    avatar.addEventListener('click', ({ target }) => avatarChosen(target))
})

const avatarChosen = (avatarClicked) => {
    console.log('click', playerTurn, avatarClicked)
    avatars.forEach(col => col.classList.remove('selected'))

    avatarClicked.classList.add('selected')

    qs('.my-avatar').innerHTML = `<i class="fas ${avatarClicked.dataset.avatar}"></i>`
    qs(`.player-${playerTurn + 1} .player-avatar`).innerHTML = `<i class="fas ${avatarClicked.dataset.avatar}"></i>`

    qs('.avatar-container').style.transform = "scale(0)"
}

// validation of the player settings

playerForm.addEventListener('submit', e => {
    e.preventDefault()

    players.push(new Player(playerScore[playerTurn], qs('.players-identity input').value))

    if (playerTurn === 0 && playerQty === 2) {
        // reset of the values
        qs('.player-settings').innerText = 'Player 2'
        qs('.name-field').value = 'Bar'
        qs('.my-color').style.background = 'var(--player2-color)'
        qs('.my-avatar').innerHTML = `<i class="fas fa-user"></i>`
        colors.forEach(col => col.classList.remove('selected'))
        playerTurn++
    }
    else {
        playerQty === 1 && (
            players.push(new Player(playerScore[1], "Max")),
            qs(`.player-2 .player-avatar`).innerHTML = `<i class="fas fa-desktop"></i>`
        )

        changeSlide()

        playerTurn = 0

        launchGame()
    }
})

// sound and music

audioSources.forEach(source => source.volume = .5)

const mute = (target) => {

        audioMuted[target] = !audioMuted[target]

        console.log(audioMuted)

        let myVolume = audioMuted[target] ? 0 : .5

        console.log(myVolume)

        audioSliders[target].value = myVolume*100
        audioSources[target].volume = myVolume

        audioSymbols[target].classList.toggle('muted')
}

audioSliders.forEach((slider, idx) => {
    slider.addEventListener('input', e => {

        const myVolume = (e.target.value / 100)

        audioSources[idx].volume = myVolume

        myVolume === 0 ? mute(idx) : audioMuted[idx] && (audioSymbols[idx].classList.toggle('muted'), audioMuted[idx] = false)
    })
})

audioSymbols.forEach((symbol, idx) => {
    symbol.addEventListener('click', () => {
        mute(idx)
    })
}
)


//Let's play this awesome dice game :)

function launchGame() {

    music.loop = true
    music.play()
    resetBtn.classList.add('reset-displayed')

    cleanBoard()

    console.log('game launched')

    dice.forEach(dice => setOfdice.push(new MyDice(dice)))

    const getRandomInt = (max) => {
        return Math.floor(Math.random() * max);
    }

    const cpuTurn = () => {

        let valueToLock = 0

        cpuCanPlay && setTimeout(() => {
            if (rollOfThedice > 0) {
                for (let diceValue = 1; diceValue <= 6; diceValue++) {

                    //I check if there is a double >= 4
                    const double = (setOfdice.filter(dice => dice.value === diceValue).length === 2)
                    double && diceValue >= 4 && (valueToLock = diceValue)

                    //I check if there is a triple
                    const triple = setOfdice.every(dice => dice.value === diceValue)
                    triple && (valueToLock = diceValue)
                }

                //If there is a good double or a triple, i keep the dice. If not, I keep the 5 and/or 6 dice(s)
                setOfdice.forEach((dice, idx) => {
                    if (valueToLock > 0) {
                        dice.value === valueToLock ? (setOfdice[idx].locked = true, setOfdice[idx].id.classList.add('locked')) : (setOfdice[idx].locked = false, setOfdice[idx].id.classList.remove('locked'))
                        dice.value === valueToLock ? lockingDice(true, idx) : lockingDice(false, idx)
                    }
                    else {
                        dice.value > 4 ? lockingDice(true, idx) : lockingDice(false, idx)
                    }
                })
            }

            roll()

        }, 250)
    }

    const newPlayerTurn = (player, txt) => {

        console.log('newTurn ' + txt)

        if (txt) {
            roundOver = true

            message(txt === 3 ? 'Draw game' : `${players[txt - 1].name} has won with ${players[txt - 1].score} pts !`, '<i class="far fa-grin"></i>')

            players.forEach((player, index) => {
                player.score = 0
                playerContainer[index].querySelector('.player-score').textContent = player.score
            })
        }

        // if there is 1 player and it is the 2nd player turn then launch the cpu turn
        player === 1 && playerQty === 1 && cpuTurn()

        playerTurn = player
        document.documentElement.style.setProperty('--current-player-color', playerColor[player])
    }

    // roll the dice and get the result
    const roll = () => {

        canRoll = false

        rollOfThedice++

        diceLocked === 3 && (rollOfThedice = 3)

        delay = 0

        let myScore = 0

        setOfdice.forEach((dice, idx) => {

            if (dice.locked) {
                return
            }

            let result = 0

            const xTurn = 4 + getRandomInt(rollMax),
                yTurn = 4 + getRandomInt(rollMax)

            dice.delay = Math.max(xTurn, yTurn) * 250

            dice.delay > delay && (delay = dice.delay)

            dice.angleX += 90 * xTurn
            dice.angleY += 90 * yTurn

            // balancing the results
            if (dice.angleX % 180) {
                getRandomInt(3) > 1 && (dice.angleX += 90)
            }
            dice.id.style.transform = "rotateX(" + dice.angleX + "deg) rotateY(" + dice.angleY + "deg)"
            dice.id.style.transitionDuration = dice.delay + 'ms'

            let x = dice.angleX % 360,
                y = dice.angleY % 360

            if (x === 0 || x === 180) {
                switch ((x + y) % 360) {
                    case 0: result = 1
                        break
                    case 90: result = 5
                        break
                    case 180: result = 6
                        break
                    case 270: result = 2
                        break
                    default:
                        console.error(123456);
                }
            }
            else if (x === 90) {
                result = 4
            }
            else if (x === 270) {
                result = 3
            }

            dice.value = result
            results[idx] = result
        })

        results.every(res => res === results[0]) ? myScore = 250 : myScore = results.reduce((prev, curr) => prev + curr, 0) * 10


        // sound of the dice rolling
        customRate = delay > 0 ? (diceSound.duration * 1000) / delay : 0
        diceSound.playbackRate = customRate
        diceSound.play()


        setTimeout(() => {
            score.textContent = myScore + ' pts'
            rollOfThedice < 3 ? (
                canRoll = true,
                playerQty === 1 && playerTurn === 1 && cpuTurn())
                : endOfTurn(myScore)
        }, delay)
    }

    rollBtn.addEventListener('click', () => {
        console.log('ollin')
        canRoll && (playerQty === 2 || playerTurn === 0) && roll()
    })

    diceContainer.forEach((container, idx) => container.addEventListener('click', () => {
        if (rollOfThedice > 0 && canRoll) {
            setOfdice[idx].locked ? lockingDice(false, idx) : lockingDice(true, idx)
            rollBtn.textContent = diceLocked === 3 ? "TAKE" : "ROLL"
        }
    }))

    const lockingDice = (action, dice) => {
        setOfdice[dice].locked = action ? true : false
        action ? setOfdice[dice].id.classList.add('locked') : setOfdice[dice].id.classList.remove('locked')
        diceLocked += action ? 1 : -1
    }

    // display the message at the end of turn / round / game
    const message = (myMessage, myPresenter) => {
        messageModal.style.transform = 'translateX(0)'
        messageModal.style.opacity = '1'
        messageText.textContent = myMessage
        presenter.innerHTML = myPresenter
    }

    messageModal.addEventListener('submit', (e) => {
        e.preventDefault()

        canRoll = true

        messageModal.style.transform = 'translateX(100vw)'
        messageModal.style.opacity = '0'

        if (gameOver) {
            cleanBoard()
            gameOver = !gameOver
        }
        else if (!roundOver) {
            // if it is the end of the first player turn then launch the second player turn / if it is the end of the second player turn, chek the winner
            playerTurn === 0 ? newPlayerTurn(1) : players[0].score !== players[1].score ? players[0].score > players[1].score ? turnWinner(0) : turnWinner(1) : newPlayerTurn(0, 3)
        }
        else { roundOver = !roundOver }
    })

    

    //end of the turn
    function endOfTurn(myScore) {

        console.log('turn ended', playerTurn)

        setTimeout(() => {
            const myTxt = myScore < 80 ? 'Don\'t cry' : myScore < 110 ? 'OK' : myScore < 130 ? 'Well done' : myScore < 150 ? 'Great' : myScore === 250 ? 'Awesome' : 'Fantastic'

            const myPresenter = myScore < 80 ? '<i class="far fa-grin-beam-sweat"></i>' : myScore < 110 ? '<i class="far fa-smile"></i>' : myScore < 130 ? '<i class="far fa-smile-beam"></i>' : myScore < 150 ? '<i class="far fa-grin-squint"></i>' : myScore === 250 ? '<i class="far fa-grin-hearts"></i>' : '<i class="far fa-grin-stars"></i>'

            message(`${myTxt} ${players[playerTurn].name},\r\n you get ${myScore} pts !`, myPresenter)

            rollOfThedice = 0
            diceLocked = 0
            rollBtn.textContent = "ROLL"
            score.textContent = '0 pt'
            results = []

            setOfdice.forEach(dice => {
                dice.locked = false
                dice.id.classList.remove('locked')
            })

            players[playerTurn].score = myScore
            playerScore[playerTurn].textContent = myScore

        }, 500)

    }


    //winner of the turn
    function turnWinner(winner) {
        players[winner].total -= players[winner].score

        const prevScore = playerTotal[winner].querySelector('.prev-score')

        prevScore.querySelector('.tiny-score').textContent = `(${players[winner].score})`

        prevScore.className = 'crossed'

        console.log(playerTotal[winner])

        playerTotal[winner].innerHTML += `<div class="prev-score">${players[winner].total}<span class="tiny-score"></span></div>`

        players[winner].total <= 0 ? endOfGame(winner) : newPlayerTurn(0, winner + 1)
    }

    //end of game

    function endOfGame(winner) {
        players[winner].gameWon += 1
        message(`${players[winner].name} won the game`, '<i class="far fa-grin"></i>')
        console.log('joueur ' + players[winner].name + ' a gagné !!!')
        newPlayerTurn(0)
        gameOver = true
    }

    // if the option menu is open, pause the cpu turn
    optionCheckbox.addEventListener('change', (e) => {
        //if there is 1 player vs the cpu, we are on the 2nd slide (the game board one) and it is the cpu turn, if it is check, set the cpuCanPlay to false in order to prevent it to play, if it is not, set the cpuCanPlay to true.
        //in any other case, set the cpuCanplay to true (prevent the bug that appears when the option modal is open durig the sto of the last roll of the cpu)
        playerQty === 1 && currentSlide === 2 && playerTurn === 1 ? (e.target.checked ? cpuCanPlay = false : (cpuCanPlay = true, roll())) : cpuCanPlay = true
    })

}

//clean board
function cleanBoard() {

    score.textContent = 0 + ' pt'

    players.forEach((player, index) => {

console.log(playerContainer[index], playerContainer[index].querySelector('.player-name'))

        player.total = goal
        player.score = 0
        playerContainer[index].querySelector('.player-name').textContent = player.name + '(' + player.gameWon + ')'
        playerContainer[index].querySelector('.player-score').textContent = player.score
        playerContainer[index].querySelector('.player-total').innerHTML = `<div class="prev-score">${player.total}<span class="tiny-score"></span></div>`
    })
    setOfdice.forEach(dice => {
        dice.angleX = 0
        dice.angleY = 0
        dice.id.style.transitionDuration = "0s"
        dice.id.style.transform = "rotateX(" + dice.angleX + "deg) rotateY(" + dice.angleY + "deg)"
    })

}

//reset the game

const displayResetModal = (action) =>{
    resetModal.style.transform = `translate(${action === "hide" ? 100 : 0}vw)`
    resetModal.style.opacity = `${action === "hide" ? 0 : 1}`
}

resetBtn.addEventListener('click', () => {
    displayResetModal('show')
})

qs('.confirm-reset').addEventListener('click', () => {
    //because there is no prevent default, the page will refresh and so reset the game isn't it clever ;)
})

qs('.reject-reset').addEventListener('click', e => {
    e.preventDefault
    displayResetModal('hide')
})
