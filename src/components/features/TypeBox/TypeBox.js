import React, { useEffect, useState, useMemo, useRef, Suspense } from "react";
import useSound from "use-sound";
import {
  wordsGenerator,
  chineseWordsGenerator,
} from "../../../scripts/wordsGenerator";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import UndoIcon from "@mui/icons-material/Undo";
import IconButton from "../../utils/IconButton";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import useLocalPersistState from "../../../hooks/useLocalPersistState";
import CapsLockSnackbar from "../CapsLockSnackbar";
import Stats from "./Stats";
import { Dialog } from "@mui/material";
import DialogTitle from "@mui/material/DialogTitle";
import {
  DEFAULT_COUNT_DOWN,
  COUNT_DOWN_90,
  COUNT_DOWN_60,
  COUNT_DOWN_30,
  COUNT_DOWN_15,
  DEFAULT_WORDS_COUNT,
  DEFAULT_DIFFICULTY,
  HARD_DIFFICULTY,
  NUMBER_ADDON,
  SYMBOL_ADDON,
  DEFAULT_DIFFICULTY_TOOLTIP_TITLE,
  HARD_DIFFICULTY_TOOLTIP_TITLE,
  NUMBER_ADDON_TOOLTIP_TITLE,
  SYMBOL_ADDON_TOOLTIP_TITLE,
  ENGLISH_MODE,
  CHINESE_MODE,
  ENGLISH_MODE_TOOLTIP_TITLE,
  CHINESE_MODE_TOOLTIP_TITLE,
  DEFAULT_DIFFICULTY_TOOLTIP_TITLE_CHINESE,
  HARD_DIFFICULTY_TOOLTIP_TITLE_CHINESE,
  RESTART_BUTTON_TOOLTIP_TITLE,
  REDO_BUTTON_TOOLTIP_TITLE,
  PACING_CARET,
  PACING_PULSE,
  PACING_CARET_TOOLTIP,
  PACING_PULSE_TOOLTIP,
  NUMBER_ADDON_KEY,
  SYMBOL_ADDON_KEY,
} from "../../../constants/Constants";
import { SOUND_MAP } from "../sound/sound";
// import SocialLinksModal from "../../common/SocialLinksModal";
const EnglishModeWords = React.lazy(() =>
  import("../../common/EnglishModeWords")
);
const ChineseModeWords = React.lazy(() =>
  import("../../common/ChineseModeWords")
);

const TypeBox = ({
  textInputRef,
  isFocusedMode,
  isUltraZenMode,
  soundMode,
  soundType,
  handleInputFocus,
  theme,
}) => {
  const [play] = useSound(SOUND_MAP[soundType], { volume: 0.5 });
  const [incorrectCharsCount, setIncorrectCharsCount] = useState(0);

  // local persist timer
  const [countDownConstant, setCountDownConstant] = useLocalPersistState(
    DEFAULT_COUNT_DOWN,
    "timer-constant"
  );

  // local persist pacing style
  const [pacingStyle, setPacingStyle] = useLocalPersistState(
    PACING_PULSE,
    "pacing-style"
  );

  // local persist difficulty
  const [difficulty, setDifficulty] = useLocalPersistState(
    DEFAULT_DIFFICULTY,
    "difficulty"
  );

  // local persist difficulty
  const [language, setLanguage] = useLocalPersistState(
    ENGLISH_MODE,
    "language"
  );

  // local persist words add on for number
  const [numberAddOn, setNumberAddOn] = useLocalPersistState(
    false,
    NUMBER_ADDON_KEY
  );

  // local persist words add on for symbol
  const [symbolAddOn, setSymbolAddOn] = useLocalPersistState(
    false,
    SYMBOL_ADDON_KEY
  );

  // Caps Lock
  const [capsLocked, setCapsLocked] = useState(false);

  // tab-enter restart dialog
  const [openRestart, setOpenRestart] = useState(false);

  const EnterkeyPressReset = (e) => {
    // press enter/or tab to reset;
    if (e.keyCode === 13 || e.keyCode === 9) {
      e.preventDefault();
      setOpenRestart(false);
      reset(
        countDownConstant,
        difficulty,
        language,
        numberAddOn,
        symbolAddOn,
        false
      );
    } // press space to redo
    else if (e.keyCode === 32) {
      e.preventDefault();
      setOpenRestart(false);
      reset(
        countDownConstant,
        difficulty,
        language,
        numberAddOn,
        symbolAddOn,
        true
      );
    } else {
      e.preventDefault();
      setOpenRestart(false);
    }
  };
  const handleTabKeyOpen = () => {
    setOpenRestart(true);
  };

  // set up words state
  const [wordsDict, setWordsDict] = useState(() => {
    if (language === ENGLISH_MODE) {
      return wordsGenerator(
        DEFAULT_WORDS_COUNT,
        difficulty,
        ENGLISH_MODE,
        numberAddOn,
        symbolAddOn
      );
    }
    if (language === CHINESE_MODE) {
      return chineseWordsGenerator(
        difficulty,
        CHINESE_MODE,
        numberAddOn,
        symbolAddOn
      );
    }
  });

  const words = useMemo(() => {
    return wordsDict.map((e) => e.val);
  }, [wordsDict]);

  const wordsKey = useMemo(() => {
    return wordsDict.map((e) => e.key);
  }, [wordsDict]);

  const wordSpanRefs = useMemo(
    () =>
      Array(words.length)
        .fill(0)
        .map((i) => React.createRef()),
    [words]
  );

  // set up timer state
  const [countDown, setCountDown] = useState(countDownConstant);
  const [intervalId, setIntervalId] = useState(null);

  // set up game loop status state
  const [status, setStatus] = useState("waiting");

  // enable menu
  const menuEnabled = !isFocusedMode || status === "finished";

  // set up hidden input input val state
  const [currInput, setCurrInput] = useState("");
  // set up world advancing index
  const [currWordIndex, setCurrWordIndex] = useState(0);
  // set up char advancing index
  const [currCharIndex, setCurrCharIndex] = useState(-1);
  const [prevInput, setPrevInput] = useState("");

  // set up words examine history
  const [wordsCorrect, setWordsCorrect] = useState(new Set());
  const [wordsInCorrect, setWordsInCorrect] = useState(new Set());
  const [inputWordsHistory, setInputWordsHistory] = useState({});

  // setup stats
  const [rawKeyStrokes, setRawKeyStrokes] = useState(0);
  const [wpmKeyStrokes, setWpmKeyStrokes] = useState(0);
  const [wpm, setWpm] = useState(0);
  const [statsCharCount, setStatsCharCount] = useState([]);

  // set up char examine hisotry
  const [history, setHistory] = useState({});
  const keyString = currWordIndex + "." + currCharIndex;
  const [currChar, setCurrChar] = useState("");

  useEffect(() => {
    if (currWordIndex === DEFAULT_WORDS_COUNT - 1) {
      if (language === ENGLISH_MODE) {
        const generatedEng = wordsGenerator(
          DEFAULT_WORDS_COUNT,
          difficulty,
          ENGLISH_MODE,
          numberAddOn,
          symbolAddOn
        );
        setWordsDict((currentArray) => [...currentArray, ...generatedEng]);
      }
      if (language === CHINESE_MODE) {
        const generatedChinese = chineseWordsGenerator(
          difficulty,
          CHINESE_MODE,
          numberAddOn,
          symbolAddOn
        );
        setWordsDict((currentArray) => [...currentArray, ...generatedChinese]);
      }
    }
    if (wordSpanRefs[currWordIndex]) {
      const scrollElement = wordSpanRefs[currWordIndex].current;
      if (scrollElement) {
        scrollElement.scrollIntoView({
          block: "center",
        });
      }
    } else {
      return;
    }
  }, [
    currWordIndex,
    wordSpanRefs,
    difficulty,
    language,
    numberAddOn,
    symbolAddOn,
  ]);

  const reset = (
    newCountDown,
    difficulty,
    language,
    newNumberAddOn,
    newSymbolAddOn,
    isRedo
  ) => {
    setStatus("waiting");
    if (!isRedo) {
      if (language === CHINESE_MODE) {
        setWordsDict(
          chineseWordsGenerator(
            difficulty,
            language,
            newNumberAddOn,
            newSymbolAddOn
          )
        );
      }
      if (language === ENGLISH_MODE) {
        setWordsDict(
          wordsGenerator(
            DEFAULT_WORDS_COUNT,
            difficulty,
            language,
            newNumberAddOn,
            newSymbolAddOn
          )
        );
      }
    }
    setNumberAddOn(newNumberAddOn);
    setSymbolAddOn(newSymbolAddOn);
    setCountDownConstant(newCountDown);
    setCountDown(newCountDown);
    setDifficulty(difficulty);
    setLanguage(language);
    clearInterval(intervalId);
    setWpm(0);
    setRawKeyStrokes(0);
    setWpmKeyStrokes(0);
    setCurrInput("");
    setPrevInput("");
    setIntervalId(null);
    setCurrWordIndex(0);
    setCurrCharIndex(-1);
    setCurrChar("");
    setHistory({});
    setInputWordsHistory({});
    setWordsCorrect(new Set());
    setWordsInCorrect(new Set());
    textInputRef.current.focus();
    // console.log("fully reset waiting for next inputs");
    wordSpanRefs[0].current.scrollIntoView();
  };

  const start = () => {
    if (status === "finished") {
      setCurrInput("");
      setPrevInput("");
      setCurrWordIndex(0);
      setCurrCharIndex(-1);
      setCurrChar("");
      setHistory({});
      setInputWordsHistory({});
      setWordsCorrect(new Set());
      setWordsInCorrect(new Set());
      setStatus("waiting");
      textInputRef.current.focus();
    }

    if (status !== "started") {
      setStatus("started");
      let intervalId = setInterval(() => {
        setCountDown((prevCountdown) => {
          if (prevCountdown === 0) {
            clearInterval(intervalId);
            // current total extra inputs char count
            const currCharExtraCount = Object.values(history)
              .filter((e) => typeof e === "number")
              .reduce((a, b) => a + b, 0);

            // current correct inputs char count
            const currCharCorrectCount = Object.values(history).filter(
              (e) => e === true
            ).length;

            // current correct inputs char count
            const currCharIncorrectCount = Object.values(history).filter(
              (e) => e === false
            ).length;

            // current missing inputs char count
            const currCharMissingCount = Object.values(history).filter(
              (e) => e === undefined
            ).length;

            // current total advanced char counts
            const currCharAdvancedCount =
              currCharCorrectCount +
              currCharMissingCount +
              currCharIncorrectCount;

            // When total inputs char count is 0,
            // that is to say, both currCharCorrectCount and currCharAdvancedCount are 0,
            // accuracy turns out to be 0 but NaN.
            const accuracy =
              currCharCorrectCount === 0
                ? 0
                : (currCharCorrectCount / currCharAdvancedCount) * 100;

            setStatsCharCount([
              accuracy,
              currCharCorrectCount,
              currCharIncorrectCount,
              currCharMissingCount,
              currCharAdvancedCount,
              currCharExtraCount,
            ]);

            checkPrev();
            setStatus("finished");

            return countDownConstant;
          } else {
            return prevCountdown - 1;
          }
        });
      }, 1000);
      setIntervalId(intervalId);
    }
  };

  const UpdateInput = (e) => {
    if (status === "finished") {
      return;
    }

    const newInput = e.target.value.trim();
    setCurrInput(newInput);

    // Use a functional update to ensure the most recent state
    setInputWordsHistory((prevHistory) => ({
      ...prevHistory,
      [currWordIndex]: newInput,
    }));
  };

  const handleKeyUp = (e) => {
    setCapsLocked(e.getModifierState("CapsLock"));
  };

  const wpmWorkerRef = useRef(null);

  useEffect(() => {
    // Initialize worker
    wpmWorkerRef.current = new Worker(
      new URL("../../../worker/calculateWpmWorker", import.meta.url)
    );

    return () => {
      // Cleanup worker on component unmount
      if (wpmWorkerRef.current) {
        wpmWorkerRef.current.terminate();
      }
    };
  }, []);

  const calculateWpm = (wpmKeyStrokes, countDownConstant, countDown) => {
    if (wpmKeyStrokes !== 0) {
      if (!wpmWorkerRef.current) return; // Ensure worker is initialized

      wpmWorkerRef.current.postMessage({
        wpmKeyStrokes,
        countDownConstant,
        countDown,
      });

      wpmWorkerRef.current.onmessage = (event) => {
        setWpm(event.data);
      };

      wpmWorkerRef.current.onerror = (error) => {
        console.error("Worker error:", error);
      };
    }
  };

  const handleKeyDown = (e) => {
    if (status !== "finished" && soundMode) {
      play();
    }
    const key = e.key;
    const keyCode = e.keyCode;
    setCapsLocked(e.getModifierState("CapsLock"));

    // keydown count for KPM calculations to all types of operations
    if (status === "started") {
      setRawKeyStrokes(rawKeyStrokes + 1);
      if (keyCode >= 65 && keyCode <= 90) {
        setWpmKeyStrokes(wpmKeyStrokes + 1);
      }
    }

    // disable Caps Lock key
    if (keyCode === 20) {
      e.preventDefault();
      return;
    }

    // disable shift alt ctrl
    if (keyCode >= 16 && keyCode <= 18) {
      e.preventDefault();
      return;
    }

    // disable tab key
    if (keyCode === 9) {
      e.preventDefault();
      handleTabKeyOpen();
      return;
    }

    if (status === "finished") {
      setCurrInput("");
      setPrevInput("");
      return;
    }

    // Update stats when typing unless there is no effective WPM
    if (wpmKeyStrokes !== 0) {
      calculateWpm(wpmKeyStrokes, countDownConstant, countDown);
    }

    // start the game by typing any thing
    if (status !== "started" && status !== "finished") {
      start();
    }

    // space bar
    if (keyCode === 32) {
      const prevCorrectness = checkPrev();
      // advance to next regardless prev correct/not
      if (prevCorrectness === true || prevCorrectness === false) {
        if (
          words[currWordIndex].split("").length > currInput.split("").length
        ) {
          setIncorrectCharsCount((prev) => prev + 1);
        }

        // reset currInput
        setCurrInput("");
        // advance to next
        setCurrWordIndex(currWordIndex + 1);
        setCurrCharIndex(-1);
        return;
      } else {
        // but don't allow entire word skip
        // console.log("entire word skip not allowed");
        return;
      }

      // backspace
    } else if (keyCode === 8) {
      // delete the mapping match records
      delete history[keyString];

      // avoid over delete
      if (currCharIndex < 0) {
        // only allow delete prev word, rewind to previous
        if (wordsInCorrect.has(currWordIndex - 1)) {
          // console.log("detected prev incorrect, rewinding to previous");
          const prevInputWord = inputWordsHistory[currWordIndex - 1];
          // console.log(prevInputWord + " ")
          setCurrInput(prevInputWord + " ");
          setCurrCharIndex(prevInputWord.length - 1);
          setCurrWordIndex(currWordIndex - 1);
          setPrevInput(prevInputWord);
        }
        return;
      }
      setCurrCharIndex(currCharIndex - 1);
      setCurrChar("");
      return;
    } else {
      setCurrCharIndex(currCharIndex + 1);
      setCurrChar(key);
      return;
      // if (keyCode >= 65 && keyCode <= 90) {
      //   setCurrCharIndex(currCharIndex + 1);
      //   setCurrChar(key);
      // } else {
      //   return;
      // }
    }
  };

  const getExtraCharClassName = (i, idx, extra) => {
    if (
      pacingStyle === PACING_CARET &&
      currWordIndex === i &&
      idx === extra.length - 1
    ) {
      return "caret-extra-char-right-error";
    }
    return "error-char";
  };

  const getExtraCharsDisplay = (word, i) => {
    let input = inputWordsHistory[i];
    if (!input) {
      input = currInput.trim();
    }
    if (i > currWordIndex) {
      return null;
    }
    if (input.length <= word.length) {
      return null;
    } else {
      const extra = input.slice(word.length, input.length).split("");
      history[i] = extra.length;
      return extra.map((c, idx) => (
        <span key={idx} className={getExtraCharClassName(i, idx, extra)}>
          {c}
        </span>
      ));
    }
  };

  const checkPrev = () => {
    const wordToCompare = words[currWordIndex];
    const currInputWithoutSpaces = currInput.trim();

    // Skip checks if current input is empty
    if (!currInputWithoutSpaces) {
      return null;
    }

    const isCorrect = wordToCompare === currInputWithoutSpaces;
    const updatedInputWordsHistory = {
      ...inputWordsHistory,
      [currWordIndex]: currInputWithoutSpaces,
    };

    // Update correct and incorrect word sets
    if (isCorrect) {
      wordsCorrect.add(currWordIndex);
      wordsInCorrect.delete(currWordIndex);
      setPrevInput("");
      setWpmKeyStrokes(wpmKeyStrokes + 1);
    } else {
      wordsInCorrect.add(currWordIndex);
      wordsCorrect.delete(currWordIndex);
      setPrevInput(
        prevInput
          ? `${prevInput} ${currInputWithoutSpaces}`
          : currInputWithoutSpaces
      );
    }

    // Update the input words history state
    setInputWordsHistory(updatedInputWordsHistory);
    return isCorrect;
  };

  const getWordClassName = (wordIdx) => {
    const isCurrentWord = currWordIndex === wordIdx;
    const isWordInCorrect = wordsInCorrect.has(wordIdx);
    const isPulseMode = pacingStyle === PACING_PULSE;

    if (isWordInCorrect) {
      return isCurrentWord
        ? isPulseMode
          ? "word error-word active-word"
          : "word error-word active-word-no-pulse"
        : "word error-word";
    }

    return isCurrentWord
      ? isPulseMode
        ? "word active-word"
        : "word active-word-no-pulse"
      : "word";
  };

  const getChineseWordKeyClassName = (wordIdx) => {
    const isCurrentWord = currWordIndex === wordIdx;
    const isWordInCorrect = wordsInCorrect.has(wordIdx);

    if (isWordInCorrect) {
      return isCurrentWord
        ? "chinese-word-key error-chinese active-chinese"
        : "chinese-word-key error-chinese";
    }

    return isCurrentWord
      ? "chinese-word-key active-chinese"
      : "chinese-word-key";
  };

  const getChineseWordClassName = (wordIdx) => {
    const isCurrentWord = currWordIndex === wordIdx;
    const isWordInCorrect = wordsInCorrect.has(wordIdx);
    const isPulseMode = pacingStyle === PACING_PULSE;

    if (isWordInCorrect) {
      return isCurrentWord
        ? isPulseMode
          ? "chinese-word error-word active-word"
          : "chinese-word error-word active-word-no-pulse"
        : "chinese-word error-word";
    }

    return isCurrentWord
      ? isPulseMode
        ? "chinese-word active-word"
        : "chinese-word active-word-no-pulse"
      : "chinese-word";
  };

  const charsWorkerRef = useRef();

  useEffect(() => {
    charsWorkerRef.current = new Worker(
      new URL("../../../worker/trackCharsErrorsWorker", import.meta.url)
    );

    charsWorkerRef.current.onmessage = (e) => {
      if (e.data.type === "increment") {
        setIncorrectCharsCount((prev) => prev + 1);
      }
    };

    return () => {
      charsWorkerRef.current.terminate();
    };
  }, []);

  useEffect(() => {
    if (status !== "started") return;

    const word = words[currWordIndex];

    charsWorkerRef.current.postMessage({
      word,
      currChar,
      currCharIndex,
    });
  }, [currChar, status, currCharIndex, words, currWordIndex]);

  const getCharClassName = (wordIdx, charIdx, char, word) => {
    const keyString = `${wordIdx}.${charIdx}`;

    const isCurrentWord = wordIdx === currWordIndex;
    const isCurrentChar = charIdx === currCharIndex;
    const isCaretMode = pacingStyle === PACING_CARET;
    const isFinished = status === "finished";

    if (
      isCaretMode &&
      isCurrentWord &&
      charIdx === currCharIndex + 1 &&
      !isFinished
    ) {
      return "caret-char-left";
    }

    const historyValue = history[keyString];
    if (historyValue === true) {
      if (
        isCaretMode &&
        isCurrentWord &&
        word.length - 1 === currCharIndex &&
        isCurrentChar &&
        !isFinished
      ) {
        return "caret-char-right-correct";
      }
      return "correct-char";
    }

    if (historyValue === false) {
      if (
        isCaretMode &&
        isCurrentWord &&
        word.length - 1 === currCharIndex &&
        isCurrentChar &&
        !isFinished
      ) {
        return "caret-char-right-error";
      }
      return "error-char";
    }

    if (isCurrentWord && isCurrentChar && currChar && !isFinished) {
      if (char === currChar) {
        history[keyString] = true;
        return "correct-char";
      } else {
        history[keyString] = false;
        return "error-char";
      }
    }

    if (wordIdx < currWordIndex) {
      // Missing chars
      history[keyString] = undefined;
    }

    return "char";
  };

  const getDifficultyButtonClassName = (buttonDifficulty) => {
    if (difficulty === buttonDifficulty) {
      return "active-button";
    }
    return "inactive-button";
  };

  const getAddOnButtonClassName = (addon) => {
    if (addon) {
      return "active-button";
    }
    return "inactive-button";
  };

  const getPacingStyleButtonClassName = (buttonPacingStyle) => {
    if (pacingStyle === buttonPacingStyle) {
      return "active-button";
    }
    return "inactive-button";
  };

  const getTimerButtonClassName = (buttonTimerCountDown) => {
    if (countDownConstant === buttonTimerCountDown) {
      return "active-button";
    }
    return "inactive-button";
  };

  const getLanguageButtonClassName = (buttonLanguage) => {
    if (language === buttonLanguage) {
      return "active-button";
    }
    return "inactive-button";
  };

  const renderResetButton = () => {
    return (
      <div className="restart-button" key="restart-button">
        <Grid container justifyContent="center" alignItems="center">
          <Box display="flex" flexDirection="row">
            <IconButton
              aria-label="redo"
              color="secondary"
              size="medium"
              onClick={() => {
                reset(
                  countDownConstant,
                  difficulty,
                  language,
                  numberAddOn,
                  symbolAddOn,
                  true
                );
              }}
            >
              <Tooltip title={REDO_BUTTON_TOOLTIP_TITLE}>
                <UndoIcon />
              </Tooltip>
            </IconButton>
            <IconButton
              aria-label="restart"
              color="secondary"
              size="medium"
              onClick={() => {
                reset(
                  countDownConstant,
                  difficulty,
                  language,
                  numberAddOn,
                  symbolAddOn,
                  false
                );
              }}
            >
              <Tooltip title={RESTART_BUTTON_TOOLTIP_TITLE}>
                <RestartAltIcon />
              </Tooltip>
            </IconButton>
            {menuEnabled && (
              <>
                <IconButton
                  onClick={() => {
                    reset(
                      COUNT_DOWN_90,
                      difficulty,
                      language,
                      numberAddOn,
                      symbolAddOn,
                      false
                    );
                  }}
                >
                  <span className={getTimerButtonClassName(COUNT_DOWN_90)}>
                    {COUNT_DOWN_90}
                  </span>
                </IconButton>
                <IconButton
                  onClick={() => {
                    reset(
                      COUNT_DOWN_60,
                      difficulty,
                      language,
                      numberAddOn,
                      symbolAddOn,
                      false
                    );
                  }}
                >
                  <span className={getTimerButtonClassName(COUNT_DOWN_60)}>
                    {COUNT_DOWN_60}
                  </span>
                </IconButton>
                <IconButton
                  onClick={() => {
                    reset(
                      COUNT_DOWN_30,
                      difficulty,
                      language,
                      numberAddOn,
                      symbolAddOn,
                      false
                    );
                  }}
                >
                  <span className={getTimerButtonClassName(COUNT_DOWN_30)}>
                    {COUNT_DOWN_30}
                  </span>
                </IconButton>
                <IconButton
                  onClick={() => {
                    reset(
                      COUNT_DOWN_15,
                      difficulty,
                      language,
                      numberAddOn,
                      symbolAddOn,
                      false
                    );
                  }}
                >
                  <span className={getTimerButtonClassName(COUNT_DOWN_15)}>
                    {COUNT_DOWN_15}
                  </span>
                </IconButton>
              </>
            )}
          </Box>
          {menuEnabled && (
            <Box display="flex" flexDirection="row">
              <IconButton
                onClick={() => {
                  reset(
                    countDownConstant,
                    DEFAULT_DIFFICULTY,
                    language,
                    numberAddOn,
                    symbolAddOn,
                    false
                  );
                }}
              >
                <Tooltip
                  title={
                    language === ENGLISH_MODE
                      ? DEFAULT_DIFFICULTY_TOOLTIP_TITLE
                      : DEFAULT_DIFFICULTY_TOOLTIP_TITLE_CHINESE
                  }
                >
                  <span
                    className={getDifficultyButtonClassName(DEFAULT_DIFFICULTY)}
                  >
                    {DEFAULT_DIFFICULTY}
                  </span>
                </Tooltip>
              </IconButton>
              <IconButton
                onClick={() => {
                  reset(
                    countDownConstant,
                    HARD_DIFFICULTY,
                    language,
                    numberAddOn,
                    symbolAddOn,
                    false
                  );
                }}
              >
                <Tooltip
                  title={
                    language === ENGLISH_MODE
                      ? HARD_DIFFICULTY_TOOLTIP_TITLE
                      : HARD_DIFFICULTY_TOOLTIP_TITLE_CHINESE
                  }
                >
                  <span
                    className={getDifficultyButtonClassName(HARD_DIFFICULTY)}
                  >
                    {HARD_DIFFICULTY}
                  </span>
                </Tooltip>
              </IconButton>
              <IconButton
                onClick={() => {
                  reset(
                    countDownConstant,
                    difficulty,
                    language,
                    !numberAddOn,
                    symbolAddOn,
                    false
                  );
                }}
              >
                <Tooltip title={NUMBER_ADDON_TOOLTIP_TITLE}>
                  <span className={getAddOnButtonClassName(numberAddOn)}>
                    {NUMBER_ADDON}
                  </span>
                </Tooltip>
              </IconButton>
              <IconButton
                onClick={() => {
                  reset(
                    countDownConstant,
                    difficulty,
                    language,
                    numberAddOn,
                    !symbolAddOn,
                    false
                  );
                }}
              >
                <Tooltip title={SYMBOL_ADDON_TOOLTIP_TITLE}>
                  <span className={getAddOnButtonClassName(symbolAddOn)}>
                    {SYMBOL_ADDON}
                  </span>
                </Tooltip>
              </IconButton>
              <IconButton>
                {" "}
                <span className="menu-separator"> | </span>{" "}
              </IconButton>
              <IconButton
                onClick={() => {
                  reset(
                    countDownConstant,
                    difficulty,
                    ENGLISH_MODE,
                    numberAddOn,
                    symbolAddOn,
                    false
                  );
                }}
              >
                <Tooltip title={ENGLISH_MODE_TOOLTIP_TITLE}>
                  <span className={getLanguageButtonClassName(ENGLISH_MODE)}>
                    eng
                  </span>
                </Tooltip>
              </IconButton>
              <IconButton
                onClick={() => {
                  reset(
                    countDownConstant,
                    difficulty,
                    CHINESE_MODE,
                    numberAddOn,
                    symbolAddOn,
                    false
                  );
                }}
              >
                <Tooltip title={CHINESE_MODE_TOOLTIP_TITLE}>
                  <span className={getLanguageButtonClassName(CHINESE_MODE)}>
                    chn
                  </span>
                </Tooltip>
              </IconButton>
            </Box>
          )}
          {menuEnabled && (
            <Box display="flex" flexDirection="row">
              <IconButton
                onClick={() => {
                  setPacingStyle(PACING_PULSE);
                }}
              >
                <Tooltip title={PACING_PULSE_TOOLTIP}>
                  <span className={getPacingStyleButtonClassName(PACING_PULSE)}>
                    {PACING_PULSE}
                  </span>
                </Tooltip>
              </IconButton>
              <IconButton
                onClick={() => {
                  setPacingStyle(PACING_CARET);
                }}
              >
                <Tooltip title={PACING_CARET_TOOLTIP}>
                  <span className={getPacingStyleButtonClassName(PACING_CARET)}>
                    {PACING_CARET}
                  </span>
                </Tooltip>
              </IconButton>
            </Box>
          )}
        </Grid>
      </div>
    );
  };

  const baseChunkSize = 120;
  const [startIndex, setStartIndex] = useState(0);
  const [visibleWordsCount, setVisibleWordsCount] = useState(baseChunkSize);

  // Reset startIndex when status changes
  useEffect(() => {
    setStartIndex(0);
  }, [status]);

  // Adjust visible words based on current word index
  useEffect(() => {
    const endIndex = startIndex + visibleWordsCount;

    // Ensure the current word is within the visible area
    if (currWordIndex >= endIndex - 5) {
      const newStartIndex = Math.max(
        0,
        Math.min(
          currWordIndex - Math.floor(visibleWordsCount / 2),
          words.length - visibleWordsCount
        )
      );

      if (newStartIndex !== startIndex) {
        setStartIndex(newStartIndex);
        setVisibleWordsCount(
          Math.min(words.length - newStartIndex, baseChunkSize)
        );
      }
    }
  }, [currWordIndex, startIndex, words.length, visibleWordsCount]);

  // Calculate the end index and slice the words
  const endIndex = useMemo(
    () => Math.min(startIndex + visibleWordsCount, words.length),
    [startIndex, visibleWordsCount, words.length]
  );

  const currentWords = useMemo(
    () => words.slice(startIndex, endIndex),
    [startIndex, endIndex, words]
  );

  return (
    <>
      {/* <SocialLinksModal status={status} /> */}
      <div onClick={handleInputFocus}>
        <CapsLockSnackbar open={capsLocked}></CapsLockSnackbar>
        {language === ENGLISH_MODE && (
          <Suspense>
            <EnglishModeWords
              currentWords={currentWords}
              currWordIndex={currWordIndex}
              isUltraZenMode={isUltraZenMode}
              startIndex={startIndex}
              status={status}
              wordSpanRefs={wordSpanRefs}
              getWordClassName={getWordClassName}
              getCharClassName={getCharClassName}
              getExtraCharsDisplay={getExtraCharsDisplay}
            />
          </Suspense>
        )}
        {language === CHINESE_MODE && (
          <Suspense>
            <ChineseModeWords
              currentWords={currentWords}
              currWordIndex={currWordIndex}
              wordsKey={wordsKey}
              isUltraZenMode={isUltraZenMode}
              status={status}
              wordSpanRefs={wordSpanRefs}
              getChineseWordKeyClassName={getChineseWordKeyClassName}
              getChineseWordClassName={getChineseWordClassName}
              getCharClassName={getCharClassName}
              getExtraCharsDisplay={getExtraCharsDisplay}
            />
          </Suspense>
        )}
        <div className="stats">
          <Stats
            status={status}
            language={language}
            wpm={wpm}
            setIncorrectCharsCount={setIncorrectCharsCount}
            incorrectCharsCount={incorrectCharsCount}
            theme={theme}
            countDown={countDown}
            countDownConstant={countDownConstant}
            statsCharCount={statsCharCount}
            rawKeyStrokes={rawKeyStrokes}
            wpmKeyStrokes={wpmKeyStrokes}
            renderResetButton={renderResetButton}
          ></Stats>
          {status !== "finished" && renderResetButton()}
        </div>
        <input
          key="hidden-input"
          ref={textInputRef}
          type="text"
          className="hidden-input"
          onKeyDown={(e) => handleKeyDown(e)}
          onKeyUp={(e) => handleKeyUp(e)}
          value={currInput}
          onChange={(e) => UpdateInput(e)}
        />
        <Dialog
          PaperProps={{
            style: {
              backgroundColor: "transparent",
              boxShadow: "none",
            },
          }}
          open={openRestart}
          onKeyDown={EnterkeyPressReset}
        >
          <DialogTitle>
            <div>
              <span className="key-note"> press </span>
              <span className="key-type">Space</span>{" "}
              <span className="key-note">to redo</span>
            </div>
            <div>
              <span className="key-note"> press </span>
              <span className="key-type">Tab</span>{" "}
              <span className="key-note">/</span>{" "}
              <span className="key-type">Enter</span>{" "}
              <span className="key-note">to restart</span>
            </div>
            <span className="key-note"> press </span>
            <span className="key-type">any key </span>{" "}
            <span className="key-note">to exit</span>
          </DialogTitle>
        </Dialog>
      </div>
    </>
  );
};

export default TypeBox;
