import React from 'react';
import { AttractorField } from './AttractorField';
import { APP_VERSION } from '../config';

export const Masthead: React.FC<{ loadedCount: number }> = ({ loadedCount }) => (
  <div className="row row--three">
    <div className="cell cell--tall">
      <div className="cell-top">
        <span className="dot title">TYPEFORGE</span>
      </div>
      <div className="cell-body">
        <div className="meta">
          <b>MRKD</b>
          FONT CONVERTER, METADATA EDITOR
          <br />
          AND BATCH RENAMER
          <br />
          VERSION {APP_VERSION}
        </div>
      </div>
    </div>

    <div className="cell cell--tall">
      <div className="cell-top">
        <span className="dot title">HOW TO USE</span>
      </div>
      <div className="cell-body">
        <div className="meta">
          <b>DROP</b>
          DROP WOFF2, WOFF, TTF OR OTF ANYWHERE ON THIS SHEET.
        </div>
        <div className="meta">
          <b>EDIT</b>
          RENAME THE FAMILY, SET THE WEIGHT, FIX THE AUTHOR AND LICENCE.
        </div>
        <div className="meta">
          <b>KEEP</b>
          EXPORT ONE FILE, A ZIP OF ALL OF THEM, OR THE @FONT-FACE CSS.
        </div>
      </div>
    </div>

    <div className="cell cell--tall cell--play">
      <AttractorField />
      <div className="cell-body">
        <p className="claim">
          {loadedCount > 0
            ? `${loadedCount} FONT${loadedCount > 1 ? 'S' : ''} LOADED. NOTHING LEAVES THIS BROWSER.`
            : 'EVERY BYTE STAYS IN YOUR BROWSER. NO UPLOAD, NO ACCOUNT, NO COST.'}
        </p>
      </div>
    </div>
  </div>
);
