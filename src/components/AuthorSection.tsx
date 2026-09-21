import React from 'react';
import { AUTHOR } from '../config';

/**
 * About / Legal / Contact, carried over from markdo27.github.io so the tool
 * closes on the same three plates as the index it is listed on.
 */
export const AuthorSection: React.FC = () => (
  <div className="row row--three">
    <div className="cell">
      <div className="cell-top">
        <span className="dot idx">F</span>
      </div>
      <div className="label">ABOUT</div>
      <div className="cell-body">
        <div className="meta">
          <b>AUTHOR</b>
          {AUTHOR.name.toUpperCase()}
        </div>
        <div className="meta">
          <b>CONTACT</b>
          <a className="mailto" href={`mailto:${AUTHOR.email}`}>
            {AUTHOR.email.toUpperCase()}
          </a>
        </div>
        <div className="meta">
          <b>THE WORK</b>
          TYPEFORGE IS DESIGNED, BUILT AND MAINTAINED BY ME. IT IS ONE OF{' '}
          <a className="mailto" href={AUTHOR.index} target="_blank" rel="noopener">
            MRKD TOOLS
          </a>
          .
        </div>
      </div>
    </div>

    <div className="cell">
      <div className="cell-top">
        <span className="dot idx">G</span>
      </div>
      <div className="label">LEGAL</div>
      <div className="cell-body">
        <div className="meta">
          <b>PERSONAL USE</b>
          FREE. USE THIS TOOL, AND ANYTHING YOU MAKE WITH IT, FOR PERSONAL, STUDY AND OTHER NON
          COMMERCIAL WORK. NO PERMISSION NEEDED.
        </div>
        <div className="meta">
          <b>COMMERCIAL USE</b>
          ASK FIRST. CLIENT, BRAND, RESALE AND ANY OTHER PAID WORK NEEDS WRITTEN PERMISSION FROM ME.
          WRITE TO{' '}
          <a
            className="mailto"
            href={`mailto:${AUTHOR.email}?subject=Commercial%20use%20request`}
          >
            {AUTHOR.email.toUpperCase()}
          </a>
        </div>
        <div className="meta">
          <b>YOUR FONTS</b>
          RENAMING A FONT DOES NOT RELICENSE IT. CHECK THE LICENCE OF ANY TYPEFACE BEFORE YOU
          REDISTRIBUTE WHAT YOU EXPORT.
        </div>
        <div className="meta">
          <b>TERMS</b>
          &copy; {AUTHOR.year} {AUTHOR.name.toUpperCase()}. PROVIDED AS IS, WITH NO WARRANTY.
        </div>
      </div>
    </div>

    <div className="cell">
      <div className="cell-top">
        <span className="dot idx">H</span>
        <span className="rdot" />
      </div>
      <div className="label">CONTACT</div>
      <div className="cell-body">
        <div className="meta">
          SOMETHING BROKEN, AN IDEA FOR A TOOL, OR A COMMERCIAL LICENCE ?<br />
          WRITE TO{' '}
          <a className="mailto" href={`mailto:${AUTHOR.email}`}>
            {AUTHOR.email.toUpperCase()}
          </a>
        </div>
        <div className="meta">
          <b>SOURCE</b>
          <a className="mailto" href={AUTHOR.repo} target="_blank" rel="noopener">
            GITHUB.COM/MARKDO27/FONTCONVERTSWIFT
          </a>
        </div>
      </div>
    </div>
  </div>
);

export const Foot: React.FC = () => (
  <div className="foot">
    <span>MRKD</span>
    <span>TYPEFORGE</span>
    <span>{AUTHOR.name.toUpperCase()}</span>
    <span>{AUTHOR.email.toUpperCase()}</span>
    <span>PERSONAL USE FREE, COMMERCIAL ON REQUEST</span>
    <span>&copy; {AUTHOR.year}</span>
  </div>
);
