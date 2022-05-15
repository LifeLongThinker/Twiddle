/**
 * CORE
 */
const UserPreferencesKeys = {
    Theme: 'theme'
}
class UserPreferences
{
    static tryGet(key, defaultTo)
    {
        try
        {
            const storedValue = localStorage.getItem(key);
            return storedValue ?? defaultTo;
        }
        catch(error)
        {
            console.error(error);
            return defaultTo;
        }
    }
    static set(key, value)
    {
        localStorage.setItem(key, value); 
    }
}
class EventEmitter
{
    constructor()
    {
        this.listeners = {};
    }

    addEventListener(eventName, callback)
    {
        this.listeners[eventName] = callback;
    }
    removeEventListener (eventName)
    {
        delete this.listeners[eventName];
    }
    emit(eventName, payload = null)
    {
        const eventCallback = this.listeners[eventName];

        if(typeof eventCallback !== 'function')
        {
            return;
        }

        eventCallback(payload);
    }
}

/**
 *  UI LAYER
 */
// THEME
class Theme
{
    static get light()
    {
        return 'light';
    }
    static get dark()
    {
        return 'dark';
    }

    static restoreFromUserPreferences()
    {
        const theme = UserPreferences.tryGet(UserPreferencesKeys.Theme, Theme.dark);
        this.set(theme);
    }
    
    static get()
    {
        return document.documentElement.getAttribute('data-theme');
    }
    static set(theme)
    {
        document.documentElement.setAttribute('data-theme', theme);
        UserPreferences.set(UserPreferencesKeys.Theme, theme);
    }
}
class ThemeCheckbox
{
    constructor(hostElement)
    {
        this.hostElement = hostElement;
        this.hostElement.addEventListener('change', this.onCheckboxChange, false);
    }

    restoreFromUserPreferences()
    {
        this.hostElement.checked = (Theme.get() == Theme.light);
    }
    onCheckboxChange(e)
    {
        const theme = e.target.checked ? Theme.light : Theme.dark;
        Theme.set(theme);
    }
}

// ALERT
class Alert
{
    constructor(hostElement)
    {
        this.hostElement = hostElement;
        this.alertMessageElement = document.getElementById('alert-message');

        this.hostElement.addEventListener('click', (e) => { this.hide() });
    }
    
    show(message, timeoutMs)
    {
        this.setMessage(message);
        this.setVisible(true);
        this.resetTimeout(timeoutMs);
    }
    hide()
    {
        this.setVisible(false);
    }
    setMessage(message)
    {
        this.alertMessageElement.innerText = message;
    }
    setVisible(visible)
    {
        if(visible)
        {
            this.hostElement.classList.add('visible');
        }
        else
        {
            this.hostElement.classList.remove('visible');
        }
    }
    resetTimeout(timeoutMs)
    {
        // clear previous timeout
        if(this.timeoutHandler)
        {
            clearTimeout(this.timeoutHandler);
        }
        
        if(!timeoutMs)
        {
            return;
        }

        // set new timeout
        this.timeoutHandler = setTimeout(() => {
            this.setMessage("");
            this.hide();
        }, timeoutMs);
    }
}

// KEYBOARD
class KeyChar
{
    constructor(char)
    {
        this.char = char;
    }

    get isSpecialChar()
    {
        return this.isBackspace || this.isEnter;
    }
    get isBackspace()
    {
        return this.char == KeyChars.Backspace.char;
    }
    get isEnter()
    {
        return this.char == KeyChars.Enter.char;
    }
}
const KeyChars =
{
    Enter: new KeyChar("↵"),
    Backspace: new KeyChar("←")
}
const KeyEvents =
{
    KeyPressed: "KeyPressed"
}
class Key extends EventEmitter
{
    constructor(hostElement, keyChar)
    {
        super();

        this.hostElement = hostElement;
        this.hostElement.textContent = keyChar.char;
        this.hostElement.addEventListener('click', this.onButtonClick.bind(this));

        if(keyChar.isSpecialChar)
        {
            this.hostElement.classList.add('special');

            // TODO: use polymorphism to make this open/closed-compatible
            if(keyChar.isBackspace)
            {
                this.hostElement.innerHTML = '<i class="fa-solid fa-delete-left"></i>';
            }
            else if(keyChar.isEnter)
            {
                this.hostElement.innerHTML = '<i class="fa-solid fa-square-check"></i>';
            }
        }

        this.keyChar = keyChar;
    }

    static insertKeyInRow(rowElement, keyChar)
    {
        const keyElement = document.createElement("button");
        rowElement.append(keyElement);

        return new Key(keyElement, keyChar);
    }

    setState(charState)
    {
        this.hostElement.classList.add(`state-${charState.toLowerCase()}`);
    }
    onButtonClick()
    {
        this.emit(KeyEvents.KeyPressed, this);
    }
}
const KeyBoardEvents =
{
    KeyPressed: "KeyPressed"
}
class KeyBoard extends EventEmitter
{
    constructor(hostElement)
    {
        super();

        this.hostElement = hostElement;
        this.keysByChars = {};

        this.instantiateRowsOfKeys();
    }
    
    setKeyStates(word, charStates)
    {
        for(var i = 0; i < word.length; i++)
        {
            const char = word[i];
            this.keysByChars[char].setState(charStates[i]);
        }
    }
    instantiateRowsOfKeys()
    {
        this.instantiateRowOfKeys("qwertyuiop");
        this.instantiateRowOfKeys("asdfghjkl");
        this.instantiateRowOfKeys(`${KeyChars.Enter.char}zxcvbnm${KeyChars.Backspace.char}`)
    }
    instantiateRowOfKeys(chars)
    {
        const rowElement = document.createElement("div");
        rowElement.classList.add("row");
        this.hostElement.append(rowElement);

        chars.toLowerCase().split("").map(char => this.instantiateKey(rowElement, new KeyChar(char)));
    }
    instantiateKey(rowElement, keyChar)
    {
        let newKey = Key.insertKeyInRow(rowElement, keyChar);
        this.keysByChars[keyChar.char] = newKey;

        newKey.addEventListener(KeyEvents.KeyPressed, this.onKeyPressed.bind(this));
    }
    onKeyPressed(keyChar)
    {
        this.emit(KeyBoardEvents.KeyPressed, keyChar);
    }
}

// GAME BOARD
class GameBoard
{
    constructor(hostElement, gameOptions)
    {
        this.hostElement = hostElement;
        this.gameOptions = gameOptions;
        this.rows = this.instantiateRowsOfTiles(gameOptions.maxAttempts);
        this.rows[0].updateInputFocus();
    }

    insertCharAt(rowIndex, char)
    {
        this.rows[rowIndex].insertChar(char);
    }
    updateInputFocusAt(rowIndex)
    {
        this.rows[rowIndex].updateInputFocus();
    }
    removeCharFrom(rowIndex)
    {
        this.rows[rowIndex].removeChar();
    }
    setRowState(rowIndex, charStates)
    {
        const row = this.rows[rowIndex];
        row.setState(charStates);
    }
    instantiateRowsOfTiles(rows)
    {
        return Array.from({length: rows}, (x, i) => TileRow.insertTileRowIntoBoard(this.hostElement, this.gameOptions));
    }
}
class TileRow
{
    constructor(hostElement, gameOptions)
    {
        this.hostElement = hostElement;
        this.tiles = this.insertTilesIntoRow(gameOptions.wordLength);
    }

    static insertTileRowIntoBoard(gameBoardElement, gameOptions)
    {
        const tileRowElement = document.createElement("div");
        tileRowElement.classList.add('row');
        gameBoardElement.append(tileRowElement);

        return new TileRow(tileRowElement, gameOptions);
    }

    insertChar(char)
    {
        const firstEmptyTile = this.tiles.find((t, i) => !t.hasChar);
        firstEmptyTile.char = char;

        this.updateInputFocus();
    }
    removeChar()
    {
        const lastNonEmptyTile = this.tiles.slice().reverse().find((t, i) => t.hasChar);
        lastNonEmptyTile.char = null;

        this.updateInputFocus();
    }
    setState(charStates)
    {
        for(var i = 0; i < charStates.length; i++)
        {
            this.tiles[i].setState(charStates[i]);
        }

        this.updateInputFocus();
    }
    clearInputFocus()
    {
        this.tiles.map(t => t.inputFocus = false);
    }
    updateInputFocus()
    {
        const indexOfFirstTileWithoutChar = this.tiles.findIndex(t => !t.hasChar);
        this.tiles.map((t, i) => t.inputFocus = indexOfFirstTileWithoutChar == i);
        console.log(indexOfFirstTileWithoutChar, this);
    }
    insertTilesIntoRow(wordLength)
    {
        return Array.from({ length: wordLength }, (x, i) => Tile.insertTileIntoRow(this.hostElement));
    }
}
class Tile
{
    constructor(hostElement)
    {
        this.hostElement = hostElement;
    }

    static insertTileIntoRow(tileRowElement)
    {
        const tileElement = document.createElement("div");
        tileElement.classList.add('tile');
        tileRowElement.append(tileElement);

        return new Tile(tileElement);
    }
    
    get hasChar()
    {
        return !!this.char;
    }
    get char()
    {
        return (this.hostElement.textContent ?? "").split("")[0];
    }
    set char(value)
    {
        value ??= "";   // turns null into empty string

        if(typeof value !== 'string')
        {
            throw new Error("Invalid value");
        }

        this.hostElement.textContent = value.split("")[0];
        this.hostElement.classList.remove('has-char');

        if(this.hasChar)
        {
            this.hostElement.classList.add('has-char');
        }
    }
    get inputFocus()
    {
        return this.hostElement.classList.contains('input-focus');
    }
    set inputFocus(value)
    {
        if(value)
        {
            this.hostElement.classList.add('input-focus');
        }
        else
        {
            this.hostElement.classList.remove('input-focus');
        }
    }

    setState(charState)
    {
        this.hostElement.classList.toggle(`state-${charState.toLowerCase()}`);
    }
    clear()
    {
        this.char = null;
    }
}

/**
 *  BUSINESS LOGIC LAYER
 */
const CharStates = {
    Present: "Present",     // char appears in a different position
    Correct: "Correct",     // char appears at same position
    Miss: "Miss"            // char does not exist
}
class Attempt
{
    constructor(gameOptions, index)
    {
        this.options = gameOptions;
        this.index = index;
        this.isValidated = false;
        this.word = "";
        this.charStates = [];
    }

    get isFull()
    {
        return this.word.length == this.options.wordLength;
    }
    get isEmpty()
    {
        return !this.word;
    }
    get isCorrect()
    {
        return this.charStates.length == this.options.wordLength
            && this.charStates.every((c, i) => c == CharStates.Correct);
    }

    add(keyChar)
    {
        if(this.isFull)
        {
            return;
        }

        this.word += keyChar.char;
    }
    removeLastChar()
    {
        if(this.isEmpty)
        {
            throw new Error("Row empty");
        }

        this.word = this.word.substring(0, this.word.length - 1);
    }
    validate(solution)
    {
        if(!this.isFull)
        {
            throw new Error("Attempt is not full.");
        }
        
        this.charStates = this.compareWordWithSolution(solution);
        this.isValidated = true;
    }
    compareWordWithSolution(solution)
    {
        const charStates = [];

        let normalizedSolution = solution.toUpperCase();
        let normalizedWord = this.word.toUpperCase();

        for(var i = 0; i < normalizedWord.length; i++)
        {
            if(normalizedWord[i] == normalizedSolution[i])
            {
                charStates.push(CharStates.Correct);
            }
            else if(normalizedSolution.indexOf(normalizedWord[i]) >= 0)
            {
                charStates.push(CharStates.Present);
            }
            else
            {
                charStates.push(CharStates.Miss);
            }
        }

        return charStates;
    }
}
class Dictionary
{
    constructor(data)
    {
        this.entries = {};
        this.wordLength = null;

        this.loadEntriesFromData(data);
    }

    static loadFromUrl(url)
    {
        return fetch(url)
            .then(resp => resp.text())
            .then(data => {
                return new Dictionary(data);
            })
            .catch((error) => console.error("Failed to download dictionary", error));
    }

    add(entry)
    {
        // normalize
        entry = entry.trim();

        this.validateWordLength(entry);
        Object.defineProperty(this.entries, entry, { writable: false });
    }
    pickRandomEntry()
    {
        const entries = Object.getOwnPropertyNames(this.entries);
        const rndInt = Math.floor(Math.random() * entries.length);
        return entries[rndInt];
    }
    contains(entry)
    {
        return this.entries.hasOwnProperty(entry);
    }

    loadEntriesFromData(data)
    {
        const entries = data.split('\n');

        for(var entry of entries)
        {
            this.add(entry);
        }
    }
    validateWordLength(entry)
    {
        if(!this.wordLength)
        {
            this.wordLength = entry.length;
            return;
        }

        if(entry.length != this.wordLength)
        {
            console.log('invalid entry', entry);
            throw new Error(`Invalid entry: '${entry}'. Expected a word length of ${this.wordLength}.`);
        }
    }
}
class GameOptions
{
    constructor(dictionary, maxAttempts)
    {
        const DEFAULT_MAX_ATTEMPTS = 6;
        
        this.dictionary = dictionary;
        this.maxAttempts = maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    }

    get wordLength()
    {
        return this.dictionary.wordLength;
    }
}
class Game
{
    constructor(options)
    {
        this.options = options ?? GameOptions.default;
        this.attempts = [];
        this.activeAttemptIndex = 0;

        this.initializeNewGame();
    }

    get activeAttempt()
    {
        return this.attempts[this.activeAttemptIndex];
    }
    get isLastAttempt()
    {
        return this.activeAttemptIndex == this.options.maxAttempts - 1;
    }
    get isFinished()
    {
        return (this.activeAttempt.isCorrect)
            || (   this.isLastAttempt
                && this.activeAttempt.isValidated);
    }

    // USER INPUT ACTIVITY
    enterChar(keyChar)
    {
        if(this.isFinished)
        {
            return new GameError(this, "Game already finished");
        }
        else if(this.activeAttempt.isFull)
        {
            if(keyChar.isEnter)
            {
                return this.validateActiveAttempt();
            }
            else if(keyChar.isBackspace)
            {
                this.activeAttempt.removeLastChar();
                return new RemovedLastCharFromAttempt(this, this.activeAttempt);
            }
            else
            {
                return new GameError(this, "Row full. Only <Enter> or <Backspace> allowed.");
            }
        }
        else if(keyChar.isEnter)
        {
            return new GameError(this, "Not enough letters.");
        }
        else if(keyChar.isBackspace)
        {
            if(this.activeAttempt.isEmpty)
            {
                return new GameError(this, "Row empty.");
            }
            else
            {
                this.activeAttempt.removeLastChar();
                return new RemovedLastCharFromAttempt(this, this.activeAttempt);
            }
        }
        else
        {
            this.activeAttempt.add(keyChar);
            return new AddedCharToAttempt(this, this.activeAttempt, keyChar);
        }
    }

    // VALIDATE ATTEMPT ACTIVITY
    validateActiveAttempt()
    {
        if(!this.options.dictionary.contains(this.activeAttempt.word))
        {
            return new InvalidAttempt();
        }

        this.activeAttempt.validate(this.solution);
        const newState = new AttemptValidated(this, this.activeAttempt);

        if(   !this.activeAttempt.isCorrect
           && !this.isLastAttempt)
        {
            // proceed to next attempt
            this.activateNextAttempt();
        }

        return newState;
    }
    activateNextAttempt()
    {
        this.activeAttemptIndex++;
    }
    initializeNewGame()
    {
        this.solution = this.options.dictionary.pickRandomEntry();
        this.attempts = Array.from( { length: this.options.maxAttempts }, (x, i) => new Attempt(this.options, i));
    }
}
class GameStateChange
{
    constructor(game)
    {
        this.game = game;
    }

    applyToUi(alert, gameBoard, keyboard) { }
}
class AddedCharToAttempt extends GameStateChange
{
    constructor(game, attempt, char)
    {
        super(game);

        this.attempt = attempt;
        this.char = char;
    }

    applyToUi(alert, gameBoard, keyboard)
    {
        const charIndex = this.attempt.word.length - 1;
        const char = this.attempt.word[charIndex];

        gameBoard.insertCharAt(this.attempt.index, char);
    }
}
class RemovedLastCharFromAttempt extends GameStateChange
{
    constructor(game, attempt)
    {
        super(game);

        this.attempt = attempt;
    }

    applyToUi(alert, gameBoard, keyboard)
    {
        gameBoard.removeCharFrom(this.attempt.index);
    }
}
class InvalidAttempt extends GameStateChange
{
    constructor(game)
    {
        super(game);
    }

    applyToUi(alert, gameBoard, keyboard)
    {
        alert.show("Not in word list.", 1000);
    }
}
class AttemptValidated extends GameStateChange
{
    constructor(game, attempt)
    {
        super(game);

        this.attempt = attempt;
    }

    applyToUi(alert, gameBoard, keyboard)
    {
        // update tiles and keys
        gameBoard.setRowState(this.attempt.index, this.attempt.charStates);
        keyboard.setKeyStates(this.attempt.word, this.attempt.charStates);
        gameBoard.updateInputFocusAt(this.game.activeAttempt.index);

        // show message if game is finished
        if(this.game.isFinished)
        {
            // give UI time to run state animation
            setTimeout(() => {
                const msg = this.attempt.isCorrect
                        ? "Yay, you win!"
                        : `Sorry, you lose! We were looking for '${this.game.solution}'.`;
                alert.show(msg);
            }, 100);
        }
    }
}
class GameError extends GameStateChange
{
    constructor(game, message)
    {
        super(game);

        this.message = message;
    }

    applyToUi(alert, gameBoard, keyboard)
    {
        alert.show(this.message, 1000);
    }
}

/**
 *  APP ROOT
 */
const alert = new Alert(document.getElementById('alert-backdrop'));

function initGame(dictionary)
{
    // set up business logic
    const options = new GameOptions(dictionary);
    const game = new Game(options);

    // set up UI
    const gameBoard = new GameBoard(document.getElementById('twiddle-gameboard'), options);
    const keyboard = new KeyBoard(document.getElementById('twiddle-keyboard'));
    const themeCheckbox = new ThemeCheckbox(document.getElementById('theme-switch-checkbox'));
    
    // hook up UI and Game
    Theme.restoreFromUserPreferences();
    themeCheckbox.restoreFromUserPreferences();
    
    keyboard.addEventListener(KeyBoardEvents.KeyPressed, key => {
        var stateChange = game.enterChar(key.keyChar);
        stateChange.applyToUi(alert, gameBoard, keyboard);
    });
    
    console.debug('New game initialized.');
}

// load dictionary, then initialize game
alert.show("Loading...");
Dictionary.loadFromUrl('./res/words5.txt')
    .then((dict) => {
        initGame(dict);
    })
    .finally(() => {
        alert.hide();
    });

console.debug('Twiddle loaded.');