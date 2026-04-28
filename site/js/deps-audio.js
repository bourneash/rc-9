// Audio dependencies loader - keeps initial AV path lightweight
import { Howl, Howler } from 'howler';

// Attach to global scope for existing AV code
window.Howl = Howl;
window.Howler = Howler;
