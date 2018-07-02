import RenderUtils from 'photography-client-lib/dist/src/utils/renderUtils';

class Utils extends RenderUtils {

  isWixIframe() {
    return window && window.Wix && (window.top !== window.self);
  }

  scrollTo(element, to, duration, isHorizontal, callback) {

    if (this.isMobile()) {
      duration = 0; //do not animate scroll on mobile (looks jumpy and buggy)
    }

    const easeInOutQuad = (currentTime, start, change, duration) => {
      //t = current time
      //b = start value
      //c = change in value
      //d = duration
      if (duration === 0) {
        return change + start;
      }

      currentTime /= duration / 2;
      if (currentTime < 1) {
        return change / 2 * currentTime * currentTime + start;
      }
      currentTime--;
      return -change / 2 * (currentTime * (currentTime - 2) - 1) + start;
    };

    const start = isHorizontal ? element.scrollLeft : element.scrollTop;
    const change = to - start;
    let currentTime = 0;
    const increment = 20;

    const animateScroll = () => {
      currentTime += increment;
      const val = easeInOutQuad(currentTime, start, change, duration);

      if (currentTime < duration) {
        setTimeout(animateScroll, increment);
      } else {
        element.setAttribute('data-scrolling', '');
        if (typeof callback === 'function') {
          callback();
        }
      }

      if (isHorizontal) {
        element.scrollLeft = val;
      } else {
        element.scrollTop = val;
      }

    };

    element.setAttribute('data-scrolling', 'true');
    animateScroll();
  }

}

export default new Utils();
