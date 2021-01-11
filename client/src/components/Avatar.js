import React, { Component } from "react";
import PropTypes from "proptypes";

import ImageEyes from "../images/avatar/eyes.png";
import ImageHands from "../images/avatar/hands.png";
import ImageHats from "../images/avatar/hats.png";
import ImageMouthes from "../images/avatar/mouthes.png";
import ImageBody from "../images/avatar/body.png";

export default class Avatar extends Component {
  render() {
    return (
      <div className="avatar" style={{ backgroundColor: this.props.colorBG }}>
        <img
          className="avatar-eyes"
          style={{ zIndex: 2, backgroundImage: `url(${ImageEyes})` }}
          src={ImageEyes}
          data-choice={this.props.eyes}
          alt="Avatar eyes"
        />
        <img
          className="avatar-hands"
          style={{ zIndex: 4, backgroundImage: `url(${ImageHands})` }}
          src={ImageHands}
          data-choice={this.props.hands}
          alt="Avatar hands"
        />
        <img
          className="avatar-hat"
          style={{ zIndex: 3, backgroundImage: `url(${ImageHats})` }}
          src={ImageHats}
          data-choice={this.props.hat}
          alt="Avatar hat"
        />
        <img
          className="avatar-mouth"
          style={{ zIndex: 2, backgroundImage: `url(${ImageMouthes})` }}
          src={ImageMouthes}
          data-choice={this.props.mouth}
          alt="Avatar mouth"
        />
        <img
          className="avatar-body"
          style={{ zIndex: 1, backgroundImage: `url(${ImageBody})` }}
          src={ImageBody}
          alt="Avatar body"
        />
        <svg
          className="avatar-background"
          style={{ zIndex: 0 }}
          viewBox="0 0 400 400"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g fillRule="evenodd">
            <path
              d="m256.5 196.4c-0.761 0.314-0.9 0.675-0.9 2.337 0 1.63-0.137 2.002-0.8 2.176-0.606 0.159-0.8 0.546-0.8 1.6s-0.194 1.441-0.8 1.6c-0.613 0.16-0.8 0.546-0.8 1.647 0 1.17-0.148 1.437-0.8 1.437-0.518 0-0.8 0.267-0.8 0.757 0 0.417-0.26 0.857-0.578 0.979s-0.698 0.861-0.844 1.643c-0.147 0.782-0.443 1.421-0.658 1.421-0.56 0-2.72 2.109-2.72 2.656 0 0.252-0.27 0.562-0.6 0.689-0.33 0.126-0.602 0.551-0.604 0.942-5e-3 0.774-2.042 2.908-3.51 3.677-0.51 0.267-1.019 1.001-1.15 1.658-0.161 0.801-0.476 1.178-0.986 1.178-0.483 0-0.75 0.284-0.75 0.8 0 0.475-0.267 0.8-0.656 0.8-0.36 0-2.311 1.71-4.334 3.8-2.509 2.592-3.965 3.8-4.582 3.8-0.566 0-0.981 0.298-1.112 0.8-0.116 0.443-0.546 0.8-0.963 0.8-0.486 0-0.753 0.283-0.753 0.8 0 0.527-0.267 0.8-0.781 0.8-0.431 0-1.359 0.718-2.067 1.6-0.863 1.074-1.605 1.6-2.256 1.6-0.634 0-1.043 0.277-1.18 0.8-0.116 0.443-0.546 0.8-0.963 0.8-0.414 0-1.113 0.36-1.553 0.8s-1.158 0.8-1.597 0.8c-0.438 0-1.021 0.36-1.296 0.8s-0.833 0.8-1.241 0.8c-0.407 0-0.835 0.36-0.95 0.8-0.164 0.627-0.546 0.8-1.763 0.8-1.056 0-1.553 0.177-1.553 0.553 0 0.305-0.36 0.648-0.8 0.763s-0.8 0.496-0.8 0.847c0 0.465-0.389 0.637-1.437 0.637-1.101 0-1.487 0.187-1.647 0.8-0.159 0.606-0.546 0.8-1.6 0.8s-1.441 0.194-1.6 0.8-0.546 0.8-1.6 0.8-1.441 0.194-1.6 0.8c-0.174 0.665-0.546 0.8-2.2 0.8s-2.026 0.135-2.2 0.8c-0.164 0.627-0.546 0.8-1.763 0.8-1.286 0-1.553 0.137-1.553 0.8 0 0.705-0.267 0.8-2.237 0.8-1.901 0-2.269 0.12-2.447 0.8-0.176 0.672-0.546 0.8-2.316 0.8s-2.14 0.128-2.316 0.8c-0.178 0.68-0.546 0.8-2.447 0.8-1.704 0-2.428 0.191-3.037 0.8-0.622 0.622-1.333 0.8-3.2 0.8s-2.578 0.178-3.2 0.8c-0.658 0.658-1.333 0.8-3.8 0.8-2.4 0-3 0.12-3 0.6 0 0.521-1.756 0.6-13.4 0.6s-13.4-0.079-13.4-0.6c0-0.483-0.622-0.6-3.2-0.6-2.933 0-3.2-0.067-3.2-0.8 0-0.709-0.267-0.8-2.353-0.8-2.017 0-2.384-0.114-2.563-0.8-0.176-0.672-0.546-0.8-2.315-0.8-1.398 0-2.352-0.222-2.838-0.662-0.68-0.616-0.782-0.616-1.462 0-0.403 0.364-1.014 0.662-1.358 0.662-0.703 0-1.111 0.809-1.111 2.2 0 1.35 0.403 2.2 1.043 2.2 0.322 0 0.557 0.407 0.557 0.967 0 1.381 0.398 2.233 1.043 2.233 0.383 0 0.557 0.499 0.557 1.6 0 1.067 0.267 1.867 0.8 2.4 0.44 0.44 0.8 1.162 0.8 1.604s0.36 1.112 0.8 1.489c0.506 0.433 0.8 1.18 0.8 2.033 0 1.012 0.2 1.401 0.8 1.558 0.606 0.159 0.8 0.546 0.8 1.6s0.194 1.441 0.8 1.6 0.8 0.546 0.8 1.6 0.194 1.441 0.8 1.6 0.8 0.546 0.8 1.6 0.194 1.441 0.8 1.6c0.597 0.156 0.8 0.546 0.8 1.536 0 0.975 0.212 1.393 0.8 1.58 0.595 0.189 0.8 0.605 0.8 1.627 0 0.954 0.183 1.373 0.6 1.373 0.368 0 0.6 0.374 0.6 0.967 0 1.381 0.398 2.233 1.043 2.233 0.306 0 0.557 0.317 0.557 0.704s0.36 0.928 0.8 1.203c0.487 0.304 0.8 0.933 0.8 1.608 0 0.65 0.331 1.347 0.8 1.685 0.441 0.318 0.8 1.035 0.8 1.6s0.359 1.282 0.8 1.6c0.44 0.317 0.8 1.004 0.8 1.526 0 0.612 0.284 1.023 0.8 1.158 0.601 0.157 0.8 0.546 0.8 1.563 0 1.086 0.158 1.353 0.8 1.353 0.533 0 0.8 0.267 0.8 0.8s0.267 0.8 0.8 0.8c0.667 0 0.8 0.267 0.8 1.6s0.133 1.6 0.8 1.6c0.497 0 0.8 0.267 0.8 0.704 0 0.387 0.36 0.928 0.8 1.203s0.8 0.905 0.8 1.399c0 0.517 0.596 1.447 1.4 2.184 0.77 0.707 1.4 1.437 1.4 1.623 0 0.504 2.171 2.487 2.722 2.487 0.263 0 0.478 0.27 0.478 0.6 0 0.333 0.356 0.6 0.8 0.6 0.533 0 0.8 0.267 0.8 0.8s0.267 0.8 0.8 0.8 0.8 0.267 0.8 0.8 0.267 0.8 0.8 0.8c0.508 0 0.8 0.267 0.8 0.73 0 0.877 1.599 2.47 2.479 2.47 0.345 0 0.722 0.36 0.837 0.8 0.16 0.613 0.546 0.8 1.647 0.8 1.17 0 1.437 0.148 1.437 0.8 0 0.44 0.264 0.8 0.586 0.8s0.779 0.36 1.014 0.8c0.274 0.513 0.838 0.8 1.567 0.8 0.803 0 1.201 0.236 1.349 0.8 0.127 0.485 0.546 0.8 1.063 0.8 0.47 0 1.241 0.36 1.713 0.8 0.5 0.466 1.412 0.8 2.183 0.8 0.862 0 1.325 0.194 1.325 0.553 0 0.554 1.159 1.031 2.529 1.042 0.4 3e-3 0.998 0.275 1.328 0.605 0.343 0.343 1.32 0.6 2.283 0.6 1.187 0 1.884 0.235 2.367 0.8 0.501 0.585 1.18 0.8 2.526 0.8 1.235 0 2.175 0.263 2.858 0.8 0.821 0.646 1.623 0.8 4.163 0.8 1.73 0 3.146 0.151 3.146 0.336 0 1.513 14.131 1.933 15.6 0.464 0.666-0.666 1.333-0.8 3.977-0.8 2.642 0 3.266-0.125 3.7-0.743 0.372-0.528 1.186-0.798 2.817-0.933 1.349-0.111 2.597-0.464 3.031-0.856 0.441-0.399 1.41-0.668 2.406-0.668 1.147 0 1.669-0.172 1.669-0.548 0-0.356 0.657-0.622 1.876-0.759 1.051-0.119 2.081-0.493 2.344-0.852 0.257-0.353 0.929-0.641 1.491-0.641 1.434 0 2.289-0.389 2.289-1.043 0-0.352 0.44-0.557 1.197-0.557 0.763 0 1.377-0.29 1.696-0.8 0.33-0.529 0.933-0.8 1.776-0.8 0.926 0 1.347-0.22 1.531-0.8 0.14-0.44 0.512-0.8 0.827-0.8s0.933-0.36 1.373-0.8 1.16-0.8 1.6-0.8c0.533 0 0.8-0.267 0.8-0.8 0-0.511 0.267-0.8 0.738-0.8 0.406 0 1.064-0.36 1.462-0.8s1.073-0.8 1.499-0.8c0.439 0 0.867-0.347 0.985-0.8 0.116-0.443 0.546-0.8 0.963-0.8 0.486 0 0.753-0.283 0.753-0.8 0-0.573 0.267-0.8 0.94-0.8 0.66 0 1.463-0.655 2.696-2.2 1.234-1.547 2.035-2.2 2.697-2.2 0.605 0 1.017-0.286 1.151-0.8 0.115-0.44 0.475-0.8 0.8-0.8s0.685-0.36 0.8-0.8c0.116-0.443 0.546-0.8 0.963-0.8 0.486 0 0.753-0.283 0.753-0.8 0-0.533 0.267-0.8 0.8-0.8s0.8-0.267 0.8-0.8 0.267-0.8 0.8-0.8c0.517 0 0.8-0.267 0.8-0.753 0-0.417 0.357-0.847 0.8-0.963 0.453-0.118 0.8-0.546 0.8-0.985 0-0.426 0.36-1.101 0.8-1.499s0.8-1.056 0.8-1.462 0.276-0.738 0.613-0.738c0.336 0 0.728-0.301 0.869-0.669 0.141-0.369 0.586-0.999 0.987-1.4 0.402-0.402 0.731-1.091 0.731-1.531s0.251-0.8 0.557-0.8c0.645 0 1.043-0.852 1.043-2.233 0-0.593 0.232-0.967 0.6-0.967 0.433 0 0.6-0.444 0.6-1.6 0-1.333 0.133-1.6 0.8-1.6 0.663 0 0.8-0.267 0.8-1.553 0-1.217 0.173-1.599 0.8-1.763 0.727-0.19 0.8-0.546 0.8-3.884s0.073-3.694 0.8-3.884c0.78-0.204 0.8-0.546 0.8-13.887 0-13.125-0.032-13.713-0.8-14.537-0.695-0.746-0.8-1.411-0.8-5.072 0-3.78-0.082-4.265-0.8-4.713-0.638-0.398-0.8-0.933-0.8-2.641 0-1.804-0.126-2.174-0.8-2.35-0.709-0.186-0.8-0.546-0.8-3.175 0-2.268-0.141-3.02-0.6-3.196-0.404-0.155-0.6-0.789-0.6-1.938 0-2.439-0.42-4.207-0.999-4.207-0.309 0-0.575-0.788-0.698-2.067-0.121-1.263-0.452-2.253-0.851-2.544-0.396-0.29-0.652-1.049-0.652-1.933 0-0.923-0.293-1.749-0.8-2.256-0.468-0.468-0.802-1.339-0.805-2.1-8e-3 -1.9-0.411-3.1-1.042-3.1-0.371 0-0.555-0.492-0.558-1.5-8e-3 -2.089-0.39-3.3-1.042-3.3-0.397 0-0.553-0.563-0.553-1.997 0-1.563-0.174-2.105-0.8-2.496-0.618-0.386-0.8-0.933-0.8-2.4s-0.182-2.014-0.8-2.4c-0.621-0.388-0.8-0.933-0.8-2.441 0-1.587-0.142-1.978-0.779-2.145-0.586-0.153-0.809-0.614-0.9-1.862l-0.121-1.659-2-0.084c-1.1-0.046-2.405 0.083-2.9 0.287"
              fill={this.props.colorBody}
            />
          </g>
        </svg>
      </div>
    );
  }
}

Avatar.propTypes = {
  eyes: PropTypes.number.isRequired,
  hands: PropTypes.number.isRequired,
  hat: PropTypes.number.isRequired,
  mouth: PropTypes.number.isRequired,
  colorBody: PropTypes.string.isRequired,
  colorBG: PropTypes.string.isRequired,
};