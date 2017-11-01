import React from 'react';
import ReactDOM from 'react-dom';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import * as actions from '../../actions/galleryActions.js';
import GalleryView from './galleryView.js';
import SlideshowView from './slideshowView.js';
import {Layouter, Item} from 'pro-gallery-layouter';
import GalleryItem from '../item/galleryItem';
import GalleryGroup from '../group/galleryGroup';
import consts from '../consts.js';
import watermarkApi from '../../store/watermarkApi2';
import _ from 'lodash';
import {utils} from '../../utils';
import {itemActions} from 'photography-client-lib';
import {versionManager} from '../../versioning/proGalleryVersionManager.js';
import storeApi from '../../store/storeApi';

const adiLoadMoreMaxHeight = 2000;
window.itemActions = itemActions; //itemActions must be saved on the window because the specific instance of each gallery's itemActions is accessed from other frames

let FullscreenContainer;
if (!utils.isInWix()) {
  import(/* webpackChunkName: "fullscreenContainer" */ '../fullscreen/fullscreenContainer.js').then(fullscreen => {
    FullscreenContainer = fullscreen.default;
  });
}

export class GalleryContainer extends React.Component {

  constructor(props, context) {
    super(props, context);

    this.closeFullscreenCallback = this.closeFullscreenCallback.bind(this);
    this.toggleInfiniteScroll = this.toggleInfiniteScroll.bind(this);
    this.toggleFullscreen = this.toggleFullscreen.bind(this);
    this.pauseAllVideos = this.pauseAllVideos.bind(this);
    this.getGalleryScroll = this.getGalleryScroll.bind(this);
    this.setWixHeight = this.setWixHeight.bind(this);
    this.scrollToItem = this.scrollToItem.bind(this);
    this.addItemToMultishare = this.addItemToMultishare.bind(this);
    this.removeItemFromMultishare = this.removeItemFromMultishare.bind(this);
    this.updateMultishareItems = this.updateMultishareItems.bind(this);

    this.reRenderForHorizontalScroll = this.reRenderForHorizontalScroll.bind(this);
    this.reRenderForScroll = this.reRenderForScroll.bind(this);
    this.reRenderForStyles = this.reRenderForStyles.bind(this);
    this.reRenderForSettings = this.reRenderForSettings.bind(this);
    this.reRenderForResize = this.reRenderForResize.bind(this);
    this.reRenderForOrientation = this.reRenderForOrientation.bind(this);
    this.reRenderForEditMode = this.reRenderForEditMode.bind(this);
    this.onResizeEvent = this.onResizeEvent.bind(this);

    if (utils.isDev() && !utils.isTest()) {
      try {
        switch (utils.safeLocalStorage().scrollThrottleMode) {
          case 'throttle250':
            this.reRenderForScroll = _.throttle(this.reRenderForScroll, 250);
            this.reRenderForHorizontalScroll = _.throttle(this.reRenderForHorizontalScroll, 250);
            break;
          case 'throttle500':
          default:
            this.reRenderForScroll = _.throttle(this.reRenderForScroll, 500);
            this.reRenderForHorizontalScroll = _.throttle(this.reRenderForHorizontalScroll, 500);
            break;
          case 'throttle1000':
            this.reRenderForScroll = _.throttle(this.reRenderForScroll, 1000);
            this.reRenderForHorizontalScroll = _.throttle(this.reRenderForHorizontalScroll, 1000);
            break;
          case 'debounce100':
            this.reRenderForScroll = _.debounce(this.reRenderForScroll, 100);
            this.reRenderForHorizontalScroll = _.debounce(this.reRenderForHorizontalScroll, 100);
            break;
          case 'debounce300':
            this.reRenderForScroll = _.debounce(this.reRenderForScroll, 300);
            this.reRenderForHorizontalScroll = _.debounce(this.reRenderForHorizontalScroll, 300);
            break;
          case 'debounce500':
            this.reRenderForScroll = _.debounce(this.reRenderForScroll, 500);
            this.reRenderForHorizontalScroll = _.debounce(this.reRenderForHorizontalScroll, 500);
            break;
          case 'none':
            break;
        }
      } catch (e) {
        //
      }
    }

    this.renderTriggers = {
      SCROLL: 'Scroll',
      STYLES: 'Styles',
      ITEMS: 'Items',
      RESIZE: 'Resize',
      ORIENTATION: 'Orientation',
      MODE: 'Mode',
      NONE: 'None',
      LAYOUT: 'Layout',
      ALL: 'All'
    };

    this.lastHeight = 0;
    this.newHeight = 0;
    this.resizeCount = 0;
    this.orientationCount = 0;
    this.scrollBase = 0;

    this.thumbnailSize = utils.isMobile() ? 90 : 120;
    this.slideshowInfoSize = 220;

    const initPromise = this.init();

    this.defaultStateStyles = {
      gotStyleParams: false,
      galleryLayout: utils.isStoreGallery() ? 2 : 0,
      selectedLayout: 0,
      isVertical: false,
      gallerySize: 320,
      minItemSize: 120,
      groupSize: 3,
      chooseBestGroup: true,
      groupTypes: '1,2h,2v,3t,3b,3l,3r',
      cubeImages: false,
      cubeType: 'fill',
      smartCrop: false,
      fullscreen: true,
      allowSocial: true,
      allowDownload: false,
      allowTitle: true,
      allowDescription: false,
      allowMultishare: false,
      loveButton: true,
      loveCounter: true,
      videoLoop: true,
      videoSpeed: 1,
      videoPlay: 'hover',
      gallerySliderImageRatio: 0,
      galleryImageRatio: 2,
      sharpParams: {
        quality: 90,
        usm: {} // do not apply usm - {usm_r: 0.66, usm_a: 1.00, usm_t: 0.01},
      },
      collageAmount: 0.8,
      collageDensity: 0.8,
      borderRadius: 0,
      boxShadow: 0,
      imageMargin: 5,
      galleryMargin: 0,
      floatingImages: 0,
      viewMode: 'preview',
      galleryHorizontalAlign: 'center',
      galleryTextAlign: 'center',
      galleryVerticalAlign: 'center',
      enableInfiniteScroll: 1,
      itemClick: 'expand',
      cubeRatio: 1, //determine the ratio of the images when using grid (use 1 for squares grid)
      fixedColumns: 0, //determine the number of columns regardless of the screen size (use 0 to ignore)
      oneRow: false, //render the gallery as a single row with horizontal scroll
      showArrows: false,
      isSlideshow: false,
      hasThumbnails: false,
      galleryThumbnailsAlignment: 'bottom',
      thumbnailSpacings: 0,
      gridStyle: 0,
      useCustomButton: utils.isStoreGallery(),
    };

    const galleryWidth = this.getGalleryWidth();
    this.galleryStructure = {};
    this.items = this.props.items;

    const itemsIds = this.itemsIds(this.items);
    this.state = {
      items: itemsIds,
      renderedItemsCount: this.props.renderedItemsCount || itemsIds.length,
      totalItemsCount: this.props.totalItemsCount || itemsIds.length,
      scroll: {
        isInfinite: this.isInfiniteScroll(),
        base: this.scrollBase || 0,
        top: this.currentScrollPosition || 0
      },
      container: {
        maxGalleryWidth: this.props.maxGalleryWidth,
        galleryWidth,
        galleryHeight: this.getGalleryHeight(),
        viewMode: 'site',
        bounds: {
          visibleTop: 0,
          visibleBottom: 1000,
          renderedTop: 0,
          renderedBottom: 3000
        },
      },
      styleParams: _.clone(this.defaultStateStyles),
      hashtag: {
        filter: utils.getWorkerWindow()['pro-gallery-hashtag-filter'] || '',
        items: []
      },
      multishare: {
        items: [],
        isMultisharing: (this.props.defaultSelectMode === true)
      }
    };
    if (initPromise) {
      initPromise.then(() => {
        this.preloadItems();
      });
    } else {
      this.preloadItems();
    }

    if (window.Wix && (utils.getViewModeFromCache() === 'editor') && utils.isStoreGallery()) {
      Wix.addEventListener(Wix.Events.EDIT_MODE_CHANGE, vm => {
        if (vm.editMode === 'preview') {
          storeApi.getStoreGalleryData(true).then(data => {
            if (utils.isDebugBuild()) {
              try {
                const currentConnectedProviders = this.getConnectedProviders();
                if (Object.keys(currentConnectedProviders)[0] !== Object.keys(data.connectedProviders)[0]) {
                  console.log('Server providers is different than client');
                }
              } catch (error) {
                console.log(error);
              }
            }

            window.connectedProviders = data.connectedProviders;
          });
        }
      });
    }
  }

  //-------------------------------------------| INIT |--------------------------------------------//

  init() {
    const initPromises = [];
    const addPromiseIfExists = value => {
 value && initPromises.push(value); 
};
    this.currentScrollPosition = 0;
    this.compId = utils.isSemiNative() ? 'compId' : Wix.Utils.getCompId();
    this.galleryId = window.galleryId;
    this.currentWindowWidth = window.innerWidth;
    this.currentWindowHeight = window.innerHeight;

    if (!utils.isSemiNative()) {
      Wix.getCurrentPageId(res => {
        this.pageId = res;
        Wix.Styles.getStyleId(res => {
          this.styleId = res;
          Wix.Utils.getSectionUrl({sectionId: utils.getFullscreenSectionId()}, res => {
            this.fullscreenUrl = res.url;
            this.setState({
              itemActionsInit: itemActions.initWidgetData({
                compId: this.compId,
                pageId: this.pageId,
                styleId: this.styleId,
                galleryId: this.galleryId,
                fullscreenUrl: this.fullscreenUrl
              })
            });
            utils.getWorkerWindow()['pro-gallery-data-' + this.compId] = {
              info: {
                compId: this.compId,
                pageId: this.pageId,
                styleId: this.styleId,
                galleryId: this.galleryId,
                dateCreated: utils.getDateCreatedTicksFromStr(window.dateCreated),
              },
              window: {
                infiniteScrollUrl: window.infiniteScrollUrl,
                instance: window.instance
              }
            };
          });
        });
      });

      Wix.getBoundingRectAndOffsets(rect => {
        this.scrollBase = rect.offsets.y * rect.scale;
        if (rect && rect.rect && !_.isUndefined(rect.rect.width)) {
          this.maxGalleryWidth = _.get(rect, 'rect.width') || 0;
        }
      });
    }

    this.initEventsFunction();

    if (initPromises.length) {
      return Promise.all(initPromises);
    }
  }

  initEventsFunction() {
    this.windowEventsFunctions = [];
    this.wixEventsFunctions = [];
    this.pubsubFunctions = [];

    if (utils.isInWix()) {
      this.wixEventsFunctions.push([Wix.Events.STYLE_PARAMS_CHANGE, this.reRenderForStyles]);
      this.wixEventsFunctions.push([Wix.Events.SETTINGS_UPDATED, this.reRenderForSettings]);
      this.wixEventsFunctions.push([Wix.Events.EDIT_MODE_CHANGE, this.reRenderForEditMode]);
      this.wixEventsFunctions.push([Wix.Events.SCROLL, this.reRenderForScroll]);
      this.pubsubFunctions.push(['multishare2gallery', this.updateMultishareItems]);
    } else {
      this.windowEventsFunctions.push(['scroll', this.reRenderForScroll]);
    }
    //global events
    this.windowEventsFunctions.push(['resize', this.onResizeEvent]);
    this.windowEventsFunctions.push(['orientationchange', this.reRenderForOrientation]);

    // MUST be 'CustomEvent'
    if (utils.isSemiNative()) {
      this.onItemClickEvent = new window.CustomEvent('on_item_click');
    } else {
      this.onItemClickEvent = document.createEvent('CustomEvent');
      this.onItemClickEvent.initCustomEvent('on_item_click', false, false, null);
    }

  }

  initEventListeners() {
    if (!utils.isInWix() && !utils.isSemiNative()) {
      $(window).on('beforeunload', () => {
        $(window).scrollTop(0);
      });
    }

    this.windowEventsFunctions.forEach(x => window.addEventListener(...x));
    if (!utils.isSemiNative()) {
      this.pubsubFunctions.forEach(x => Wix.PubSub.subscribe(...x));
      this.wixEventsFunctions.forEach(x => Wix.addEventListener(...x));
    }

    document.addEventListener('scroll', this.reRenderForHorizontalScroll, true);

  }

  removeEventListeners() {
    this.wixEventsFunctions.forEach(x => Wix.removeEventListener(...x));
    this.windowEventsFunctions.forEach(x => window.removeEventListener(...x));
    this.pubsubFunctions.forEach(x => Wix.PubSub.unsubscribe(...x));

    document.removeEventListener('scroll', this.reRenderForHorizontalScroll, true);
  }

  initNavigationEventListeners() {
    if (!utils.isSemiNative()) {
      Wix.addEventListener(Wix.Events.PAGE_NAVIGATION_IN, () => {
        this.initEventListeners();
        this.props.actions.navigationIn();
        itemActions.getStats();
      });
      Wix.addEventListener(Wix.Events.PAGE_NAVIGATION_OUT, () => {
        this.removeEventListeners();
        this.pauseAllVideos();
      });
    }
  }

  initPersistentEventListeners() {
    window.addEventListener('fullscreen_closed', this.closeFullscreenCallback);
  }

  initCustomEvents() {
    if (utils.isSemiNative()) {
      this.galleryScrollEvent = new window.CustomEvent('gallery_scroll'); // MUST be 'CustomEvent'
      this.pauseAllVideosEvent = new window.CustomEvent('pause_all_videos'); // MUST be 'CustomEvent'
    } else {
      this.galleryScrollEvent = document.createEvent('CustomEvent'); // MUST be 'CustomEvent'
      this.galleryScrollEvent.initCustomEvent('gallery_scroll', false, false, null);

      this.pauseAllVideosEvent = document.createEvent('CustomEvent'); // MUST be 'CustomEvent'
      this.pauseAllVideosEvent.initCustomEvent('pause_all_videos', false, false, null);
    }
  }

  preloadItems() {
    const preloadSize = (Number(_.get(window, 'debugApp')) || 10);
    const preloadedItems = [];
    if (utils.isVerbose()) {console.time(`Preloaded ${preloadSize} items`);}
    for (let i = 0; i < preloadSize; i++) {
      const dto = this.items[i];
      if (!dto || !dto.itemId) {break;}
      const item = new GalleryItem({dto, watermark: this.props.watermarkData});
      preloadedItems[i] = new Image();
      preloadedItems[i].src = item.thumbnail_url.img;
    }
    if (utils.isVerbose()) {console.timeEnd(`Preloaded ${preloadSize} items`);}
  }

  //-----------------------------------------| STYLES |--------------------------------------------//

  getStyleBySeed(seed) {
    if (!seed > 0) {
      seed = 999999;
    }
    seed = Math.floor(seed);

    const strToSeed = str => {
      str = String(str);
      let total = 0;
      for (let s = 0; s < str.length; s++) {
        total += str.charCodeAt(s);
      }
      return total;
    };

    const mergeSeeds = (s1, s2) => {
      return Math.floor(((s1 / s2) - Math.floor(s1 / s2)) * 10000000);
    };

    if (utils.isSite() && (_.get(this, 'state.styleParams.gotStyleParams')) && !this.props.styleParams) {
      if (utils.isVerbose()) { //todo yoshi
        console.log('already got style params, not fetching again', this.state.styleParams);
      }
      return;
    }

    const numFromSeed = (min, max, strSeed) => {
      const seed2 = strToSeed(strSeed);
      const range = max - min + 1;
      return (mergeSeeds(seed, seed2) % range) + min;
    };

    const boolFromSeed = strSeed => {
      return !!numFromSeed(0, 1, strSeed);
    };

    const style = {
      cubeImages: boolFromSeed('cubeImages'),
      cubeRatio: numFromSeed(1, 25, 'cubeRatio') / 5,
      isVertical: boolFromSeed('isVertical'),
      gallerySize: numFromSeed(300, 800, 'gallerySize'),
      collageAmount: numFromSeed(5, 10, 'collageAmount') / 10,
      collageDensity: (versionManager.isNewSpacing() ? numFromSeed(1, 100, 'collageDensity') : numFromSeed(5, 10, 'collageDensity')) / 100,
      groupTypes: ['1'].concat(_.filter('2h,2v,3t,3b,3l,3r,3h,3v'.split(','), (type, i) => boolFromSeed('groupTypes' + i))),
      oneRow: boolFromSeed('oneRow'),
      borderRadius: 0,
      boxShadow: 0,
      imageMargin: numFromSeed(0, (versionManager.isNewSpacing() ? 250 : 5), 'imageMargin'),
      galleryMargin: (versionManager.isNewSpacing() ? numFromSeed(0, 50, 'galleryMargin') : numFromSeed(0, 5, 'imageMargin')),
      floatingImages: 0,
      chooseBestGroup: boolFromSeed('chooseBestGroup'),
      smartCrop: boolFromSeed('smartCrop'),
      showArrows: false,
      cubeType: 'fill',
      hasThumbnails: false,
      enableScroll: true,
      isGrid: false,
      isSlideshow: false,
      isSlider: false,
      isColumns: false,
      cropOnlyFill: false,
      fixedColumns: 0,
      enableInfiniteScroll: 1,
    };

    //force adjustments
    if (style.oneRow) {
      style.isVertical = false;
    }
    style.galleryType = style.isVertical ? 'Columns' : 'Strips';
    style.groupSize = parseInt(_.last(style.groupTypes));
    style.groupTypes = style.groupTypes.join(',');
    style.minItemSize = style.gallerySize / style.groupSize / 2;

    if (utils.isVerbose()) { //todo yoshi
      console.log('Created magic layout style', seed, style);
    }

    return style;
  }

  getStyleByGalleryType(galleryType, gallerySize) {
    //legacy layouts

    const galleryTypes = {
      collage_ver: {
        cubeImages: false,
        isVertical: true,
        galleryType: 'Columns',
        groupSize: 3,
        groupTypes: '1,2h,2v,3t,3b,3l,3r',
        gallerySize: Math.round(gallerySize * 5 + 500),
        fixedColumns: 0
      },
      collage_hor: {
        cubeImages: false,
        isVertical: false,
        galleryType: 'Strips',
        groupSize: 3,
        groupTypes: '1,2h,2v,3t,3b,3l,3r',
        gallerySize: Math.round(gallerySize * 5 + 500),
        fixedColumns: 0
      },
      grid: {
        cubeImages: true,
        isVertical: true,
        galleryType: 'Columns',
        groupSize: 1,
        groupTypes: '1',
        gallerySize: Math.round(gallerySize * 8.5 + 150),
        fixedColumns: 0,
        isGrid: true
      },
      masonry_ver: {
        cubeImages: false,
        isVertical: true,
        galleryType: 'Columns',
        groupSize: 1,
        groupTypes: '1',
        gallerySize: Math.round(gallerySize * 8 + 200),
        fixedColumns: 0
      },
      masonry_hor: {
        cubeImages: false,
        isVertical: false,
        galleryType: 'Strips',
        groupSize: 1,
        groupTypes: '1',
        gallerySize: Math.round(gallerySize * 5 + 200),
        fixedColumns: 0
      },
      one_col: {
        cubeImages: false,
        isVertical: true,
        galleryType: 'Columns',
        groupSize: 1,
        groupTypes: '1',
        gallerySize: this.getGalleryWidth(),
        fixedColumns: 1
      },
      one_row: {
        cubeImages: false,
        isVertical: false,
        galleryType: 'Strips',
        groupSize: 1,
        groupTypes: '1',
        gallerySize: this.getGalleryHeight(),
        fixedColumns: 0
      },
      slideshow: {
        showArrows: true,
        cubeImages: true,
        cubeRatio: this.getGalleryRatio(),
        isVertical: true,
        gallerySize: this.getGalleryWidth(),
        galleryType: 'Columns',
        groupSize: 1,
        groupTypes: '1',
        fixedColumns: 1
      }
    };

    let styleState;

    switch (galleryType) {
      case '-1': //empty
        styleState = {
          gallerySize
        };
        break;
      case '0': //vertical collage
        styleState = galleryTypes.collage_ver;
        break;
      default:
      case '1': //horizontal collage
        styleState = galleryTypes.collage_hor;
        break;
      case '2': //grid
        styleState = galleryTypes.grid;
        break;
      case '3': //vertical masonry
        styleState = galleryTypes.masonry_ver;
        break;
      case '4': //horizontal masonry
        styleState = galleryTypes.masonry_hor;
        break;
      case '5': //one column
        styleState = galleryTypes.one_col;
        break;
      case '6': //one row
        styleState = galleryTypes.one_row;
        break;
      case '7': //slideshow
        styleState = galleryTypes.slideshow;
        break;
    }

    return styleState;

  }

  getStyleByLayout(wixStyles) {
    //new layouts
    let {galleryLayout, gallerySize, magicLayoutSeed} = wixStyles;

    const emptyLayout = {
      galleryType: undefined,
      groupSize: undefined,
      showArrows: undefined,
      cubeImages: undefined,
      cubeType: undefined,
      cubeRatio: undefined,
      isVertical: undefined,
      gallerySize: undefined,
      collageAmount: undefined,
      collageDensity: undefined,
      groupTypes: undefined,
      oneRow: undefined,
      borderRadius: undefined,
      boxShadow: undefined,
      imageMargin: undefined,
      galleryMargin: undefined,
      floatingImages: undefined,
      chooseBestGroup: undefined,
      smartCrop: undefined,
      hasThumbnails: undefined,
      enableScroll: undefined,
      isGrid: undefined,
      isSlider: undefined,
      isColumns: undefined,
      isSlideshow: undefined,
      cropOnlyFill: undefined,
      fixedColumns: undefined,
      enableInfiniteScroll: undefined,
    };

    const layouts = {
      collage: {
        showArrows: false,
        cubeImages: false,
        groupSize: 3,
        groupTypes: '1,2h,2v,3t,3b,3l,3r',
        gallerySize: Math.round(gallerySize * 5 + 500),
        fixedColumns: 0,
        hasThumbnails: false,
        enableScroll: true,
        isGrid: false,
        isSlider: false,
        isColumns: false,
        isSlideshow: false,
        cropOnlyFill: false
      },
      masonry: {
        showArrows: false,
        cubeImages: false,
        groupSize: 1,
        groupTypes: '1',
        gallerySize,
        fixedColumns: 0,
        hasThumbnails: false,
        enableScroll: true,
        isGrid: false,
        isSlider: false,
        isColumns: false,
        isSlideshow: false,
        cropOnlyFill: false,
        oneRow: false,
      },
      grid: {
        showArrows: false,
        cubeImages: true,
        smartCrop: false,
        imageResize: false,
        galleryImageRatio: 2,
        numberOfImagesPerRow: 3,
        isVertical: true,
        galleryType: 'Columns',
        groupSize: 1,
        groupTypes: '1',
        fixedColumns: undefined,
        gallerySize: Math.round(gallerySize * 8.5 + 150),
        hasThumbnails: false,
        enableScroll: true,
        cropOnlyFill: false,
        isSlider: false,
        isColumns: false,
        isGrid: true,
        isSlideshow: false,
        minItemSize: 50
      },
      thumbnails: {
        showArrows: true,
        cubeImages: true,
        smartCrop: false,
        cubeType: 'fill',
        cubeRatio: (() => {
          const dims = this.getGalleryDimensions();
          return (dims.galleryWidth / dims.galleryHeight);
        }),
        isVertical: false,
        galleryType: 'Strips',
        groupSize: 1,
        gallerySize: this.getGalleryWidth(),
        groupTypes: '1',
        oneRow: true,
        hasThumbnails: true,
        enableScroll: false,
        isGrid: false,
        isSlider: false,
        isColumns: false,
        isSlideshow: false,
        cropOnlyFill: false,
        floatingImages: 0,
        galleryMargin: 0,
        imageMargin: 0
      },
      slider: {
        showArrows: true,
        cubeImages: true,
        smartCrop: false,
        isVertical: false,
        galleryType: 'Strips',
        groupSize: 1,
        gallerySliderImageRatio: 0,
        groupTypes: '1',
        gallerySize: this.getGalleryHeight(),
        oneRow: true,
        hasThumbnails: false,
        enableScroll: true,
        isGrid: false,
        isSlider: true,
        isColumns: false,
        isSlideshow: false,
        cropOnlyFill: true
      },
      slideshow: {
        showArrows: true,
        cubeImages: true,
        smartCrop: false,
        cubeRatio: (() => {
          const dims = this.getGalleryDimensions();
          return (dims.galleryWidth / dims.galleryHeight);
        }),
        cubeType: 'fill',
        isVertical: false,
        gallerySize: 550,
        galleryType: 'Strips',
        groupSize: 1,
        groupTypes: '1',
        fixedColumns: 1,
        oneRow: true,
        hasThumbnails: false,
        enableScroll: false,
        isGrid: false,
        isColumns: false,
        isSlider: false,
        isSlideshow: true,
        cropOnlyFill: false,
        floatingImages: 0,
        galleryMargin: 0,
        imageMargin: 0
      },
      panorama: {
        showArrows: false,
        cubeImages: false,
        isVertical: true,
        galleryType: 'Columns',
        groupSize: 1,
        groupTypes: '1',
        gallerySize: this.getGalleryWidth(),
        oneRow: false,
        fixedColumns: 1,
        hasThumbnails: false,
        enableScroll: true,
        isGrid: false,
        isColumns: false,
        isSlider: false,
        isSlideshow: false,
        cropOnlyFill: false
      },
      column: {
        showArrows: true,
        cubeImages: true,
        smartCrop: false,
        cubeType: 'fill',
        cubeRatio: 0.35,
        isVertical: false,
        galleryType: 'Strips',
        groupSize: 1,
        groupTypes: '1',
        gallerySize: this.getGalleryHeight(),
        fixedColumns: 0,
        hasThumbnails: false,
        oneRow: true,
        enableScroll: true,
        isGrid: false,
        isColumns: true,
        isSlider: false,
        isSlideshow: false,
        cropOnlyFill: false
      },
      magic: this.getStyleBySeed(magicLayoutSeed)
    };

    const specialMobileStoreConfig = {};
    const isStoreMobile = utils.isStoreGallery() && utils.isMobile();
    if (isStoreMobile) {
      galleryLayout = 2;
      specialMobileStoreConfig.forceMobileCustomButton = true;
    }

    const galleyLayoutList = [
      'collage',
      'masonry',
      'grid',
      'thumbnails',
      'slider',
      'slideshow',
      'panorama',
      'column',
      'magic'
    ];

    let layoutName = galleyLayoutList[galleryLayout || 0];

    if (utils.isStoreGallery() && _.isUndefined(galleryLayout)) {
      layoutName = galleyLayoutList[2];
    }

    if (utils.isVerbose()) { //todo yoshi
      console.log('chosen layout is', layoutName);
    }

    return _.merge(emptyLayout, layouts[layoutName], specialMobileStoreConfig);

  }

  getStyleParamsState() {

    let wixStyles = {};
    let stateStyles = {};

    function canSet(wixParam, stateParam) {
      // wixStyles    =>  Styles arrived directly from wix
      // stateStyles  =>  The result of the styles format
      // wixParam     =>  The name of the parameter in wixParams
      // stateParam   =>  The name of the parameter in the formatted styles result
      if (_.isUndefined(stateParam)) {
        // the wixParam and stateParam have the same names
        // check that the wixParam is not already set in the stateStyles AND wixStyles have it
        return (_.isUndefined(stateStyles[wixParam]) && !_.isUndefined(wixStyles[wixParam]));
      } else {
        // the stateParam and wixParam have different names
        // check that the stateParam is not already set in the stateStyles AND wixStyles have the wixParam
        return (_.isUndefined(stateStyles[stateParam]) && !_.isUndefined(wixStyles[wixParam]));
      }
    }

    if (utils.isSite() && (_.get(this, 'state.styleParams.gotStyleParams'))) {
      if (utils.isVerbose()) { //todo yoshi
        console.log('already got style params, not fetching again', this.state.styleParams);
      }
      return this.state.styleParams;
    }

    let gotStyleParams = !(utils.isInWix() && !utils.isDemo()); // if in Wix wait for real (not default) style params

    if (utils.isInWix() && Wix && Wix.Styles && Wix.Styles.getStyleParams()) {
      const sp = Wix.Styles.getStyleParams();
      wixStyles = {};
      _.merge(wixStyles, sp.booleans, sp.numbers, sp.colors, sp.fonts);
      gotStyleParams = true;
    } else if (typeof (window.styles) === 'object') {
      wixStyles = window.styles;
    } else if (utils.parseGetParam('galleryStyle')) {
      const galleryStyle = utils.parseGetParam('galleryStyle');

      if (/^[\],:{}\s]*$/.test(galleryStyle.replace(/\\["\\\/bfnrtu]/g, '@').replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {
        //the json is ok
        wixStyles = JSON.parse(decodeURIComponent(galleryStyle));
      }
    }

    if (this.props.styleParams) {
      _.merge(wixStyles, this.props.styleParams);
    }

    wixStyles.gallerySize = wixStyles.gallerySize || 30;

    if (!_.isUndefined(wixStyles.galleryType) && _.isUndefined(wixStyles.galleryLayout)) {
      //legacy layouts - only if galleyrType parameter is specifically defined (i.e. layout had changed)
      if (utils.isVerbose()) { //todo yoshi
        console.log('Using galleryType for defaults', wixStyles);
      }

      stateStyles = this.getStyleByGalleryType(String(wixStyles.galleryType), wixStyles.gallerySize); //legacy layouts
      stateStyles.layoutsVersion = 1;
      const selectedLayoutVars = ['galleryType', 'galleryThumbnailsAlignment', 'magicLayoutSeed', 'imageResize', 'isVertical', 'scrollDirection', 'enableInfiniteScroll'];
      stateStyles.selectedLayout = selectedLayoutVars.map(key => String(wixStyles[key])).join('|');
    } else {
      //new layouts
      if (utils.isVerbose()) { //todo yoshi
        console.log('Using galleryLayout for defaults', wixStyles);
      }
      stateStyles = this.getStyleByLayout(wixStyles);
      const selectedLayoutVars = ['galleryLayout', 'galleryThumbnailsAlignment', 'magicLayoutSeed', 'imageResize', 'isVertical', 'scrollDirection', 'enableInfiniteScroll'];
      stateStyles.selectedLayout = selectedLayoutVars.map(key => String(wixStyles[key])).join('|');
      stateStyles.layoutsVersion = 2;
      stateStyles.selectedLayoutV2 = wixStyles.galleryLayout;
      if (utils.isVerbose()) { //todo yoshi
        console.log('new selected layout', stateStyles.selectedLayout);
      }
    }

    //behaviour
    if (canSet('fullscreen')) {
      stateStyles.fullscreen = (wixStyles.fullscreen.toString() == '0');
    } else {
      stateStyles.fullscreen = true;
    }

    if (canSet('allowSocial')) {
      stateStyles.allowSocial = wixStyles.allowSocial;
    }

    if (canSet('allowTitle')) {
      stateStyles.allowTitle = utils.isOnBoarding() ? true : wixStyles.allowTitle;
    }

    if (canSet('isInAdi')) {
      stateStyles.isInAdi = wixStyles.isInAdi;
    }

    if (canSet('useCustomButton')) {
      stateStyles.useCustomButton = wixStyles.useCustomButton;
    }

    if (canSet('allowDescription')) {
      stateStyles.allowDescription = wixStyles.allowDescription;
    }

    if (canSet('allowDownload')) {
      stateStyles.allowDownload = wixStyles.allowDownload;
    }

    if (canSet('loveButton')) {
      stateStyles.loveButton = wixStyles.loveButton;
    }

    //note: 0 is true and false is 1 - super confusing (can't change it - because of backwards compatibility)
    if (canSet('loveCounter')) {
      stateStyles.loveCounter = (wixStyles.loveCounter === 0);
    }

    if (canSet('enableInfiniteScroll')) {
      stateStyles.enableInfiniteScroll = (wixStyles.enableInfiniteScroll == '1');
    }

    //design
    if (canSet('isVertical')) {
      stateStyles.isVertical = ((String(wixStyles.isVertical) == '1'));
    }
    if (canSet('imageOrientation', 'isVertical')) {
      stateStyles.isVertical = ((String(wixStyles.imageOrientation) == '1'));
    }

    if (canSet('collageAmount')) {
      stateStyles.collageAmount = Number(wixStyles.collageAmount) / 10;
    }

    if (canSet('collageDensity')) {
      stateStyles.collageDensity = Number(wixStyles.collageDensity) / 100;
    }

    if (canSet('minItemSize')) {
      stateStyles.minItemSize = wixStyles.minItemSize;
    }

    if (canSet('gallerySize')) {
      stateStyles.gallerySize = stateStyles.gallerySize;
    }

    if (canSet('gridStyle')) {
      stateStyles.gridStyle = wixStyles.gridStyle;
    }

    if (canSet('groupSize')) {
      stateStyles.groupSize = Number(wixStyles.groupSize);
    }

    if (canSet('chooseBestGroup')) {
      stateStyles.chooseBestGroup = (String(wixStyles.chooseBestGroup) == 1);
    }

    if (canSet('groupTypes')) {
      stateStyles.groupTypes = String(wixStyles.groupTypes);
    }

    if (canSet('borderRadius')) {
      stateStyles.borderRadius = Number(wixStyles.borderRadius);
    }

    if (canSet('boxShadow')) {
      stateStyles.boxShadow = Number(wixStyles.boxShadow) / 100;
    }

    if (canSet('imageMargin')) {
      stateStyles.imageMargin = Number(wixStyles.imageMargin) / 2;
      if (utils.isMobile()) {
        stateStyles.imageMargin = Math.min(stateStyles.imageMargin, 25); //limit mobile spacing to 50px (25 on each side)
      }
    }

    if (canSet('galleryMargin')) {
      stateStyles.galleryMargin = Number(wixStyles.galleryMargin);
    }

    if (canSet('floatingImages')) {
      stateStyles.floatingImages = Number(wixStyles.floatingImages) / 100;
    }

    if (canSet('thumbnailSpacings')) {
      stateStyles.thumbnailSpacings = Number(wixStyles.thumbnailSpacings) / 2;
    }

    if (canSet('cubeImages')) {
      stateStyles.cubeImages = ((String(wixStyles.cubeImages) == '1'));
    }

    if (canSet('smartCrop')) {
      stateStyles.smartCrop = ((String(wixStyles.smartCrop) == '1'));
    }

    if (canSet('cubeRatio')) {
      stateStyles.cubeRatio = Number(eval(wixStyles.cubeRatio));
    }

    if (canSet('imageResize', 'cubeType')) {
      stateStyles.cubeType = ((String(wixStyles.imageResize) == 1) ? 'fit' : 'fill');
      if (stateStyles.cubeType == 'fit') {
        stateStyles.cubeRatio = 1;

        if (stateStyles.cropOnlyFill === true) {
          stateStyles.cubeImages = false;
        }
      }
    }

    if (stateStyles.isSlider) {
      const val = canSet('gallerySliderImageRatio', 'cubeRatio') ? wixStyles.gallerySliderImageRatio : this.defaultStateStyles.gallerySliderImageRatio;
      stateStyles.cubeRatio = Number(eval(['16/9', '4/3', '1', '3/4', '9/16'][Number(val)]));
    } else if (stateStyles.isGrid) {
      const val = canSet('galleryImageRatio', 'cubeRatio') ? wixStyles.galleryImageRatio : this.defaultStateStyles.galleryImageRatio;
      stateStyles.cubeRatio = Number(eval(['16/9', '4/3', '1', '3/4', '9/16'][Number(val)]));
    }

    if (canSet('fixedColumns')) {
      stateStyles.fixedColumns = Number(wixStyles.fixedColumns);
    }

    if (canSet('scrollDirection', 'oneRow')) {
      stateStyles.oneRow = (String(wixStyles.scrollDirection) == '1');

      if (stateStyles.oneRow) {
        //if oneRow is true, use horizontal layouts only
        stateStyles.isVertical = false;
      }
    }

    if (stateStyles.isGrid && !stateStyles.oneRow) {
      // if (canSet('numberOfImagesPerRow', 'fixedColumns')) {
      //If toggle is for Items per row, fill the fixedColumns with the number of items
      //If toggle is responsive, make fixedColumns to be 0 or undefined;
      //Show the new controls only on Vertical scroll (one ow is false)
      stateStyles.fixedColumns = stateStyles.gridStyle == 1 ? (Number(wixStyles.numberOfImagesPerRow || stateStyles.numberOfImagesPerRow)) : 0;
      stateStyles.groupTypes = '1';
      stateStyles.groupSize = 1;
      stateStyles.collageAmount = 0;
      stateStyles.collageDensity = 0;
      // }
    }

    if (canSet('numberOfImagesPerCol')) {
      if (stateStyles.isGrid && stateStyles.oneRow) {
        stateStyles.numberOfImagesPerCol = Number(wixStyles.numberOfImagesPerCol);
        stateStyles.fixedColumns = 0;
        switch (stateStyles.numberOfImagesPerCol) {
          case 1:
          default:
            stateStyles.groupTypes = '1';
            stateStyles.groupSize = 1;
            stateStyles.collageAmount = 0;
            stateStyles.collageDensity = 0;
            break;
          case 2:
            stateStyles.groupTypes = '2v';
            stateStyles.groupSize = 2;
            stateStyles.collageAmount = 1;
            stateStyles.collageDensity = 1;
            break;
          case 3:
            stateStyles.groupTypes = '3v';
            stateStyles.groupSize = 3;
            stateStyles.collageAmount = 1;
            stateStyles.collageDensity = 1;
            break;
        }
      }
    }

    if (canSet('galleryThumbnailsAlignment')) {
      stateStyles.galleryThumbnailsAlignment = ['bottom', 'left', 'top', 'right'][wixStyles.galleryThumbnailsAlignment];
    }

    if (canSet('allowMultishare')) {
      //ODEDS: changed to hardcoded false, disabling all occurences of multishare for now
      stateStyles.allowMultishare = false; // !!(wixStyles.allowMultishare) && utils.isWidgetInSite('multishare_widget'); //the widget must be present to show the multishare
    }

    //There's some kunch-ptant here so support opacity, checkout .default css className usage
    // (If this style isn't defined, we add 'default' to the className, and there we all the default params)
    if (canSet('itemOpacity')) {
      stateStyles.itemOpacity = wixStyles.itemOpacity;
    }

    if (canSet('galleryLayout')) {
      stateStyles.galleryLayout = wixStyles.galleryLayout;
    }

    if (utils.isStoreGallery()) {
      const isGrid = _.isUndefined(stateStyles.galleryLayout) || stateStyles.galleryLayout == 2;
      const isMasonry = stateStyles.galleryLayout == 1;
      const titleOnHover = stateStyles.titlePlacement == 1 || wixStyles.titlePlacement == 1;

      if (!isGrid && !isMasonry) {
        stateStyles.titlePlacement = consts.placements.SHOW_ON_HOVER;
      } else if (stateStyles.isVertical != 1 || stateStyles.oneRow === true) {
        stateStyles.titlePlacement = consts.placements.SHOW_ON_HOVER;
      } else if (titleOnHover) {
        stateStyles.titlePlacement = consts.placements.SHOW_ON_HOVER;
      } else {
        stateStyles.titlePlacement = consts.placements.SHOW_ALWAYS;
      }
    } else {
      stateStyles.titlePlacement = consts.placements.SHOW_ON_HOVER;
    }

    if (canSet('itemFont')) {
      stateStyles.itemFont = wixStyles.itemFont;
    }

    if (canSet('itemFontSlideshow')) {
      stateStyles.itemFontSlideshow = wixStyles.itemFontSlideshow;
    }

    if (canSet('galleryHorizontalAlign')) {
      let horizontalAlign;
      let textAlign;
      switch (wixStyles.galleryHorizontalAlign) {
        case 0:
          horizontalAlign = 'flex-start';
          textAlign = 'left';
          break;
        case 1:
        default:
          horizontalAlign = 'center';
          textAlign = 'center';
          break;
        case 2:
          horizontalAlign = 'flex-end';
          textAlign = 'right';
          break;
      }

      stateStyles.galleryHorizontalAlign = horizontalAlign;
      stateStyles.galleryTextAlign = textAlign;
    }

    if (canSet('galleryVerticalAlign')) {
      let verticalAlign;
      switch (wixStyles.galleryVerticalAlign) {
        case 0:
        default:
          verticalAlign = 'flex-start';
          break;
        case 1:
          verticalAlign = 'center';
          break;
        case 2:
          verticalAlign = 'flex-end';
          break;
      }
      stateStyles.galleryVerticalAlign = verticalAlign;
    }

    if (canSet('itemClick')) {
      switch (wixStyles.itemClick) {
        case 0:
        default:
          stateStyles.itemClick = 'expand';
          break;
        case 1:
          stateStyles.itemClick = 'link';
          break;
        case 2:
          stateStyles.itemClick = 'nothing';
          break;
      }
    }

    if (canSet('loadMoreButtonText')) {
      stateStyles.loadMoreButtonText = String(wixStyles.loadMoreButtonText);
    }

    if (canSet('customButtonText')) {
      stateStyles.customButtonText = String(wixStyles.customButtonText);
    }

    stateStyles.sharpParams = {
      quality: 90,
      usm: {}
    };

    if (canSet('imageQuality')) {
      stateStyles.sharpParams.quality = wixStyles.imageQuality;
    }

    if (canSet('usmToggle') && wixStyles.usmToggle == true) {
      if (canSet('usm_a')) {
        stateStyles.sharpParams.usm.usm_a = (wixStyles.usm_a || 0) / 100;
      }
      if (canSet('usm_r')) {
        stateStyles.sharpParams.usm.usm_r = wixStyles.usm_r;
      }
      if (canSet('usm_t')) {
        stateStyles.sharpParams.usm.usm_t = (wixStyles.usm_t || 0) / 255;
      }
    }

    if (canSet('videoPlay')) {
      switch (wixStyles.videoPlay) {
        case 0:
        default:
          stateStyles.videoPlay = 'hover';
          break;
        case 1:
          stateStyles.videoPlay = 'auto';
          break;
        case 2:
          stateStyles.videoPlay = 'onClick';
          break;
      }
    }
    if (canSet('videoSpeed')) {
      stateStyles.videoSpeed = wixStyles.videoSpeed;
    }
    if (canSet('videoLoop')) {
      stateStyles.videoLoop = wixStyles.videoLoop;
    }

    //Backwards compatibility for masonry layout
    if (stateStyles.selectedLayoutV2 == 1) {
      if (stateStyles.isVertical) {
        stateStyles.gallerySize = Math.round(stateStyles.gallerySize * 8 + 200);
      } else {
        stateStyles.gallerySize = Math.round(stateStyles.gallerySize * 5 + 200);
      }
    }

    if (stateStyles.forceMobileCustomButton) {
      stateStyles.gallerySize = Math.round(30 * 8.5 + 150);
      stateStyles.titlePlacement = consts.placements.SHOW_ALWAYS;
      stateStyles.galleryLayout = 2;
      stateStyles.fixedColumns = 1;
      stateStyles.numberOfImagesPerRow = 1;
    }

    stateStyles.gotStyleParams = gotStyleParams;

    if (utils.isVerbose()) { //todo yoshi
      console.log('Got styles from Wix', stateStyles);
    }

    return _.merge({}, this.defaultStateStyles, stateStyles);

  }

  //-----------------------------------------| REACT |--------------------------------------------//

  componentWillReceiveProps(newProps) {
    if (utils.isVerbose()) { //todo yoshi
      console.log('Received new props', newProps);
    }
    try {
      if (newProps.items) {
        if (this.getHashtagFilter()) {
          this.initHashtagFilter(() => {
            utils.setStateAndLog(this, 'Receiving Props', {
              items: this.sortItemsByHashtag(newProps.items),
              totalItemsCount: newProps.totalItemsCount
            }, () => {
              this.reRender(this.renderTriggers.ALL);
            });
          });
        } else {

          const canSetItems = //replacing the gallery items is allowed when:
            (newProps.items.length > this.state.items.length) || //infinite scroll - adding new items to the list
            _.includes(['manuallySetImages', 'albumSetFromBuilder'], newProps.galleryDataSrc) || //manual set of new items (managePhotos, wixCode, photoAlbums etc.)
            utils.isPlayground(); //in the playground

          if (canSetItems) {
            if (utils.isVerbose()) { //todo yoshi
              console.log(`Got new props with new items`, newProps, this.state.items);
            }
            this.items = newProps.items;
            utils.setStateAndLog(this, 'Receiving Props', {
              items: this.itemsIds(newProps.items),
              totalItemsCount: newProps.totalItemsCount
            }, () => {
              this.reRender(this.renderTriggers.ALL);
            });
          } else if ((newProps.items.length < this.state.items.length) && utils.isDev()) {
            console.warn(`Got new props with fewer items`, newProps, this.state.items);
          }
        }
      }
    } catch (e) {
      console.error('Failed settings new props', e);
    }
  }

  componentDidMount() {
    this.initEventListeners();
    this.initPersistentEventListeners();
    this.initCustomEvents();
    this.initNavigationEventListeners();
    this.initHashtagFilter();

    if (!utils.isInWix() || utils.isTest()) { //in wix the stylesParamsChanged event will be the first reRender
      this.reRender(this.renderTriggers.ALL);
    }
  }

  componentWillUnmount() {
    this.removeEventListeners();
  }

  //-----------------------------------------| ITEMS |--------------------------------------------//

  itemsIds(items) {
    return items.map(item => item.itemId);
  }

  allItems() {
    return this.items;
  }

  currentItems() {
    if (this.state) {
      return this.allItems().slice(0, this.state.renderedItemsCount);
    } else {
      return this.allItems().slice(0, 50);
    }
  }

  layoutItems() {
    return this.galleryStructure.layoutItems;
  }

  findVisibleItems() {

    const container = this.getLatestState('container', {});
    const styleParams = this.getLatestState('styleParams', {});
    const galleryWidth = this.getLatestState('container.galleryWidth', 980);

    if (this.getHashtagFilter()) {
      return this.state.totalItemsCount;
    }

    if (!this.galleryStructure.ready) {
      return this.state.renderedItemsCount;
    }

    const toGroup = _.last(_.last(this.galleryStructure.columns));
    const galleryHeight = this.galleryStructure.height * utils.getViewportScaleRatio();

    const addAfter = this.getLatestState('gotScrollEvent') && (galleryHeight - container.galleryHeight < (styleParams.imageMargin + styleParams.galleryMargin) * 2) && (!toGroup || toGroup.rendered); //if the last item is already rendered - get more items

    let to = (toGroup ? _.last(toGroup.items).idx + 1 : 0);

    if (addAfter) {

      if (utils.shouldLog('infinite_scroll')) {
        console.log('INFINITE SCROLL - Adding new items', galleryHeight, to, toGroup);
      }

      //find the number of extra images to bring - according to the number of images that fit in the screen
      const averageItemHeight = (galleryHeight > 0 && to > 0) ? (galleryHeight / to) : (styleParams.gallerySize / styleParams.groupSize / (galleryWidth / styleParams.gallerySize)); //calc the average item height according to the real gallery or using an estimate
      const itemsOnScreen = Math.ceil(utils.getScreenHeight() / averageItemHeight);

      let itemsToAdd = itemsOnScreen * 10; //bring 10 screens at a time
      if (utils.isMobile() || itemsToAdd < 100) {
        //round to 100 or 500 items per fetch
        itemsToAdd = 100;
      } else {
        itemsToAdd = 500;
      }

      to += itemsToAdd;
    } else if (utils.shouldLog('infinite_scroll')) {
        console.log('INFINITE SCROLL - NOT adding new items', galleryHeight, to, toGroup)
      }

    return to;
  }

  concatNewItems(newItems) {

    //add new items to the gallery - make sure there are no overlapping items and the order is correct
    let curItems = this.currentItems();

    if (!newItems || !newItems.length > 0) {
      return curItems;
    }

    curItems = curItems.concat(newItems);
    // curItems = _.uniqBy(curItems, (item) => item.itemId || item.photoId || item.url);
    // curItems = _.sortBy(curItems, (item) => item.orderIndex);
    // curItems = curItems.slice(0, this.state.totalItemsCount);

    return curItems;
  }

  getRequiredItemsFromDbIfNeeded(toItem, callback = _.noop) {

    toItem = Math.min(this.state.totalItemsCount, toItem);

    //check which items are missing
    const curTo = this.state.renderedItemsCount || 0;
    const propsTo = this.allItems().length || 0;

    const defaultRes = {
      items: [],
      totalItemsCount: this.state.totalItemsCount
    };

    const counts = '\n(current items count: ' + curTo + ' | new items count: ' + toItem + ' | items in memory: ' + propsTo + ' | total items: ' + this.state.totalItemsCount + ' | rendered items: ' + this.state.renderedItemsCount + ')';

    if (this.alreadyGettingItems === true) {
      callback(defaultRes);
      return false;

    } else if (Math.min(propsTo, toItem) > curTo) {

      if (utils.shouldLog('infinite_scroll')) {
        console.log('Infinite Scroll - Fetching items from MEMORY ' + counts);
      }

      this.alreadyGettingItems = false;

      callback({
        items: this.allItems().slice(curTo, toItem),
        totalItemsCount: this.state.totalItemsCount
      });

    } else if (toItem > curTo) {
      if (utils.shouldLog('infinite_scroll')) {
        console.log('Infinite Scroll - Fetching items from DB ' + counts);
        console.time('Fetching items from DB');
      }
      this.alreadyGettingItems = true;

      let storeParameter = '';
      if (utils.isStoreGallery()) {
        storeParameter = `&isStore=true`;
      }

      $.ajax({
        url: `${window.infiniteScrollUrl}from/${curTo}/to/${toItem + 1}?instance=${window.instance}${storeParameter}`,
        xhrFields: {
          withCredentials: true
        },
        success: res => {
          if (utils.shouldLog('infinite_scroll')) {
            console.timeEnd('Infinite Scroll - Fetching items from DB');
            console.log('Infinite Scroll - Fetched items from DB', res);
          }
          callback(res || defaultRes);
          this.alreadyGettingItems = false;
        },
        error: () => {
          this.alreadyGettingItems = false;
          callback(defaultRes);
        }
      });
    } else {
      if (utils.shouldLog('infinite_scroll')) {
        console.log('Infinite Scroll - Not fetching items ' + counts);
      }
      callback(defaultRes);
    }
  }

  scrollToItemIfNeeded() {
    //after height is changed - scroll to an item if needed
    if (this.shouldScrollTo >= 0) {
      setTimeout(() => {
        const scrolled = this.scrollToItem(this.shouldScrollTo);
        if (scrolled) {
          this.shouldScrollTo = -1;
        }
      }, 10);
    }
  }

  scrollToItem(itemIdx, fixedScroll, isManual) {

    let pos;
    const horizontalElement = $('.gallery-horizontal-scroll');

    if (fixedScroll === true) {
      //scroll by half the container size

      if (this.state.styleParams.oneRow) {
        pos = horizontalElement.scrollLeft() + itemIdx * this.state.container.galleryWidth / 2;
      } else {
        pos = this.state.scroll.top + itemIdx * this.state.container.galleryHeight / 2;
      }

    } else {

      //scroll to specific item
      if (utils.isVerbose()) { //todo yoshi
        console.log('Scrolling to items #' + itemIdx);
      }

      const items = this.galleryStructure.items;

      const item = _.find(items, item => (item.idx == itemIdx));
      pos = this.state.styleParams.oneRow ? _.get(item, 'offset.left') : _.get(item, 'offset.top');

      if (utils.isVerbose()) { //todo yoshi
        console.log('Scrolling to position ' + pos, item);
      }

      if (!(pos >= 0)) {
        console.warn('Position not found, not scrolling');
        return false;
      }

      if (this.state.styleParams.oneRow) {

        if (isManual && _.isFunction(_.get(window, 'galleryWixCodeApi.onItemChanged'))) {
          window.galleryWixCodeApi.onItemChanged(item);
        }

        //set scroll to place the item in the middle of the component
        const diff = (this.state.container.galleryWidth - item.width) / 2;
        if (diff > 0) {
          pos -= diff;
        }
        pos = Math.max(0, pos) / utils.getViewportScaleRatio();
        if (utils.isVerbose()) { //todo yoshi
          console.log('Scrolling to new position ' + pos, this);
        }
      }
    }

    //pos -= item.height; //don't scroll too much so that the item is not too close to the edge of the container

    utils.setStateAndLog(this, 'Scroll To Item', {
      scrollTop: pos
    }, () => {
      if (this.state.styleParams.oneRow) {
        if (utils.isVerbose()) { //todo yoshi
          console.log('Scrolling horiontally', pos, horizontalElement);
        }
        horizontalElement.animate({scrollLeft: (Math.round(pos * utils.getViewportScaleRatio()))}, 400); //todo - make sure this triggers the infinite scroll!!!
      } else if (utils.isInWix()) {
        if (utils.isVerbose()) { //todo yoshi
          console.log('Scrolling vertically (in wix)');
        }
        if (utils.getViewModeFromCache() !== 'editor') {
          Wix.scrollTo(0, Math.round(this.scrollBase + (pos * utils.getViewportScaleRatio())));
        }
      } else {
        if (utils.isVerbose()) { //todo yoshi
          console.log('Scrolling vertically (not in wix)');
        }
        //$(window).animate({scrollTop: pos + 'px'});
        $(window).scrollTop(Math.round(pos * utils.getViewportScaleRatio()));
      }
    });

    return true;

  }

  resetItems(items) {
    for (let item, i = 0; item = items[i]; i++) {
      item.width = item.maxWidth;
      item.height = item.maxHeight;
    }

    return items;
  }

  //-----------------------------------------| UTILS |--------------------------------------------//

  getLatestState(key, defaultValue) {
    try {
      if (!_.isUndefined(this.newState) && !_.isUndefined(_.get(this.newState, key))) {
        return _.get(this.newState, key);
      } else if (this.state) {
        return _.get(this.state, key);
      } else if (!_.isUndefined(defaultValue)) {
        return defaultValue;
      } else {
        return undefined;
      }
    } catch (e) {
      console.warn('Cannot find key in newState', key, e);
      return null;
    }
  }

  getDimensionFix() {
    return (Number(this.getLatestState('styleParams.imageMargin', 0)) - Number(this.getLatestState('styleParams.galleryMargin', 0)));
  }

  getGalleryWidth() {
    // const DomWidth = window.innerWidth && document.documentElement.clientWidth ?
    //   Math.min(window.innerWidth, document.documentElement.clientWidth) :
    //   window.innerWidth ||
    //   document.documentElement.clientWidth ||
    //   document.getElementsByTagName('body')[0].clientWidth;
    const domWidth = this.protectGalleryWidth(utils.isMobile() ? document.body.clientWidth : window.innerWidth); //on mobile we use the document width - which takes in account the pixel ratio fix (width more that 100% and scale down)
    return (utils.isSemiNative() ? this.props.layout.width : domWidth) + this.getDimensionFix() * 2; //add margins to width and then remove them in css negative margins
  }

  getGalleryHeight() {
    return (utils.isSemiNative() ? this.props.layout.height : window.innerHeight) + this.getDimensionFix();
  }

  getGalleryRatio() {
    return this.getGalleryWidth() / this.getGalleryHeight();
  }

  getVisibleBounds(scrollTop, pageScale) {

    if (this.debugScroll) {console.time('SCROLL - getVisibleBounds time');}

    if (typeof (scrollTop) === 'undefined') {
      scrollTop = 0;
    }
    if (typeof (pageScale) === 'undefined') {
      pageScale = 1;
    }

    let screenSize = utils.getScreenHeight() / pageScale;
    let renderedPadding = utils.parseGetParam('renderedPadding') || screenSize * 10;
    let visiblePadding = utils.parseGetParam('displayPadding') || screenSize * 1.5;
    let onscreenPadding = utils.parseGetParam('onscreenPadding') || 0;

    if (this.state.styleParams.oneRow) {
      screenSize = utils.getScreenWidth() / pageScale; //horizontal layouts will use the same infinite scroll mechanism for horizonal scroll (left => top, right => bottom)
      renderedPadding = utils.parseGetParam('renderedPadding') || screenSize * 10;
      visiblePadding = utils.parseGetParam('displayPadding') || screenSize * 5;
      onscreenPadding = utils.parseGetParam('onscreenPadding') || 0;
      //slideshows required more padding (it usually has larger images and one image per row)
    }

    let docViewTop = scrollTop;
    let docViewBottom = docViewTop + screenSize; //cannot get the real document height - using the screen as default

    if (!this.isInfiniteScroll() && !this.state.styleParams.oneRow) {
      docViewTop = 0;
      docViewBottom = this.getGalleryHeight() / pageScale;
    }

    // viewport window on both sides
    const onscreenTop = (docViewTop - onscreenPadding);
    const onscreenBottom = (docViewBottom + onscreenPadding);

    const visibleTop = (docViewTop - visiblePadding);
    const visibleBottom = (docViewBottom + visiblePadding);

    const renderedTop = (docViewTop - renderedPadding);
    const renderedBottom = (docViewBottom + renderedPadding);

    const bounds = {
      docViewTop,
      docViewBottom,
      onscreenTop,
      onscreenBottom,
      visibleTop,
      visibleBottom,
      renderedTop,
      renderedBottom,
    };

    if (this.debugScroll) {console.timeEnd('SCROLL - getVisibleBounds time');}

    return {
      bounds
    };
  }

  getGalleryScroll(params) {
    if (this.state.styleParams.oneRow) {
      this.currentScrollPosition = $('.gallery-horizontal-scroll').scrollLeft();
    } else if (params && _.isNumber(params.customScrollTop)) {
      this.currentScrollPosition = params.customScrollTop;
      return this.currentScrollPosition;
    } else if (utils.isInWix()) {
      if (params && _.isNumber(params.scrollTop) && _.isNumber(params.y)) {
        const scrollBase = params.y;
        const scrollTop = params.scrollTop;
        this.pageScale = params.scale || 1;
        if (this.scrollBase !== scrollBase) {
          if (utils.isDev()) {
            console.log('gallery ' + this.compId + ' scroll base has changed from ' + this.scrollBase + ' to ' + scrollBase);
          }
          this.scrollBase = scrollBase * this.pageScale;
        }
        this.currentScrollPosition = ((scrollTop - this.scrollBase) / utils.getViewportScaleRatio()) * this.pageScale;
      }
      return this.currentScrollPosition;
    } else {
      this.currentScrollPosition = $(window).scrollTop();
      return this.currentScrollPosition;
    }
  }

  getGalleryDimensions() {

    const res = {
      galleryWidth: this.getGalleryWidth(),
      galleryHeight: this.getGalleryHeight()
    };

    const thumbnailSize = this.thumbnailSize + this.getLatestState('styleParams.galleryMargin', 0) + 3 * this.getLatestState('styleParams.thumbnailSpacings', 0);

    if (this.getLatestState('styleParams.hasThumbnails', false)) {
      switch (this.getLatestState('styleParams.galleryThumbnailsAlignment', '')) {
        case 'top':
        case 'bottom':
          res.galleryHeight -= thumbnailSize;
          break;
        case 'left':
        case 'right':
          res.galleryWidth -= thumbnailSize;
          break;
      }
    } else if (this.getLatestState('styleParams.isSlideshow', false)) {
      // res.galleryHeight = 550; //if the height of the image is constant
      res.galleryHeight -= this.slideshowInfoSize; //if the height of the text is constant
    }

    return res;
  }

  protectGalleryWidth(width) {

    let maxGalleryWidth;
    if (utils.isSite()) {
      maxGalleryWidth = Number(utils.parseGetParam('width'));
    }

    if (utils.browserIs('chromeIos')) {
      // This can be the width calc for all galleries, but in chromeIos it must be used otherwise there is a gap on the left of the gallery.
      // Currently there is a bug with Mitzi that the width parmeter is not updating fast enough once it is fixed, use this code always.
      maxGalleryWidth = maxGalleryWidth || document.body.clientWidth;
    } else {
      maxGalleryWidth = document.body.clientWidth;
    }

    if (utils.isMobile()) {
      maxGalleryWidth = Math.floor(maxGalleryWidth / utils.getViewportScaleRatio());
    }
    return Math.min(Math.floor(width), maxGalleryWidth);
  }

  setWixHeight(height, lastHeight, trigger) {

    if (height <= 0) {
      console.warn('Wix setHeight called with height less than 0');
      return;
    }

    this.lastHeight = Math.round(lastHeight);
    this.newHeight = Math.round(height);

    //resize wix tpa window if needed
    const getNeededHeight = (height, trigger) => {

      const getMaxRowHeight = () => {
        const maxByScreen = window.screen.height * 0.6; //make sure that the gallery is not heigher than the screen
        const maxByFirstGroup = (this.state.container.galleryWidth / this.galleryStructure.firstGroup.ratio) * 0.8; //make sure more than 1 group is visible
        const maxBySlideshow = (this.state.container.galleryWidth * 9 / 16) + this.slideshowInfoSize; //in slideshow and thumbnails, the group ratio is calculated by the height so we need a fixed value

        if (this.state.styleParams.isSlideshow || this.state.styleParams.hasThumbnails) {
          return maxBySlideshow;
        } else if (this.state.styleParams.oneRow) {
          return Math.min(maxByScreen, maxByFirstGroup);
        } else if (!this.state.styleParams.enableInfiniteScroll == '1') { //vertical with show more
          return maxByScreen;
        } else {
          return false;
        }
      };

      let newHeight = Math.round(height * utils.getViewportScaleRatio());
      let should = true;

      if (!this.isInfiniteScroll() || _.get(this, 'state.styleParams.oneRow')) {
        should = false;
      }

      if (this.state.styleParams.hasThumbnails && ['top', 'bottom'].indexOf(this.state.styleParams.galleryThumbnailsAlignment) >= 0) {
        newHeight += this.thumbnailSize;
      }

      const maxRowHeight = getMaxRowHeight();
      if ((utils.isEditor() || utils.isInAlbumsBuilder()) && maxRowHeight) {
        if (trigger === this.renderTriggers.LAYOUT) {
          if (_.get(this, 'state.styleParams.oneRow') || !_.get(this, 'state.styleParams.enableInfiniteScroll')) {
            //when the layout changes, if the new layout is horizontal or with the show more button, adjust the height
            should = false;
            if ((newHeight > maxRowHeight)) {
              //only reduce the size of the gallery
              newHeight = maxRowHeight;
              should = true;
            } else if (this.state.styleParams.isSlideshow) {
              newHeight = maxRowHeight;
              should = true;
            }
          }
        } else if (this.state.styleParams.isInAdi && !this.state.styleParams.enableInfiniteScroll) {
          newHeight = Math.min(newHeight, adiLoadMoreMaxHeight);
          should = true;
        }
      }

      return should && newHeight;
    };

    const neededHeight = getNeededHeight(this.newHeight, trigger);
    if (neededHeight) {
      if (utils.isVerbose()) {
        console.log('updating height', neededHeight);

      }

      if (Math.abs(lastHeight - neededHeight) < 2 || neededHeight == 0) {
        if (utils.isVerbose()) {
          console.log('Skipping Wix height change: was ' + this.lastHeight + ', now it\'s ' + neededHeight);
        }
      } else {

        utils.setStateAndLog(this, 'setWixHeight', _.merge(this.state.container, {
          galleryHeight: neededHeight
        }));

        if (utils.isInWix()) {
          if (utils.isVerbose()) {
            console.warn('Changing wix height from: ' + lastHeight + '  to: ' + neededHeight + ' inner gallery height is: ' + this.newHeight);
          }
          if (this.lastSetHeight !== neededHeight) {
            Wix.setHeight(neededHeight);
            this.lastSetHeight = neededHeight;
          }
          this.heightWasSetInternally = true;
        }
      }
    }

    this.scrollToItemIfNeeded();
  }

  isInfiniteScroll() {

    const styleParamsInfiniteScroll = _.get(this, 'state.styleParams.enableInfiniteScroll'); //if undefined -> enable infinite scroll
    const stateInfiniteScroll = _.get(this, 'state.scroll.isInfinite'); //if defined -> override style params
    const gotStylesParams = _.get(this, 'state.styleParams.gotStyleParams'); //if false -> do not allow infinite scroll yet

    if (!gotStylesParams) {
      return false;
    } else {
      //DO NOT allow infinite scroll only if both styleParams and state are FALSE
      return (styleParamsInfiniteScroll || stateInfiniteScroll);
    }

  }

  //----------------------------------------| ACTIONS |-------------------------------------------//

  onResizeEvent(e) {

    //workaround for safari issue - calling resize on style change
    if (this.currentWindowWidth !== window.innerWidth || this.currentWindowHeight !== window.innerHeight) {
      if (!utils.isiPhone() ||
        this.currentWindowWidth !== window.innerWidth ||
        (Math.abs(this.currentWindowHeight - window.innerHeight) > 25)
      ) {
        this.currentWindowWidth = window.innerWidth;
        this.currentWindowHeight = window.innerHeight;
        this.reRenderForResize(e);

      }
    }
  }

  toggleInfiniteScroll(forceVal) {
    utils.setStateAndLog(this, 'Toggle Infinite Scroll', {
      scroll: _.merge(this.state.scroll, {
        isInfinite: true
      })
    }, () => {
      this.reRenderForResize();
    });
  }

  getConnectedProviders() {
    let connectedProviders = window.connectedProviders;
    try {
      if (!connectedProviders && window.prerenderedGallery && prerenderedGallery.gallerySettings) {
        let gallerySettings = prerenderedGallery.gallerySettings;
        if (typeof gallerySettings === 'string') {
          gallerySettings = JSON.parse(utils.stripSlashes(gallerySettings));
        }
        if (gallerySettings && typeof gallerySettings === 'object' && gallerySettings.connectedProviders) {
          connectedProviders = gallerySettings.connectedProviders;
        }
      }
    } catch (error) {
      console.error(`Error getting connected providers`, error);
    }

    if (!connectedProviders) {
      console.error(`No connected providers`);
    }

    return connectedProviders;
  }

  toggleFullscreen(itemIdx, config = {}) {
    if (!this.state.styleParams.fullscreen) {return;}

    if (this.state.styleParams.itemClick == 'nothing') {
      return;
    }

    if (typeof itemIdx !== 'undefined' && itemIdx !== false) {

      if (this.state.totalItemsCount > 0) {
        itemIdx = (itemIdx + this.state.totalItemsCount) % this.state.totalItemsCount;
      }

      const itemDto = this.allItems()[itemIdx];
      const item = new GalleryItem({
        dto: (itemDto.dto || itemDto),
        createdBy: 'toggleFullscreen'
      });

      if (this.state.styleParams.itemClick == 'link') {
        if (item.linkType && item.linkType !== 'none') {
          if (item.linkType === 'web') {
            window.open(item.linkUrl, item.linkOpenType);
          } else if (item.linkType === 'wix') {
            Wix.navigateTo(item.linkData);
          } else {
            Wix.navigateToPage(item.linkUrl, {noTransition: true});
          }
        }
      } else {

        if (utils.isVerbose()) { //todo yoshi
          console.log('Time to Fullscreen VM - START');
        }

        const prefix = '//' + ((window.staticsVersion == 'debug') ? 'local.wix.com:9001' : 'progallery.wix.com') + '/';

        window.currentGalleryItems = this.allItems();
        window.totalItemsCount = this.state.totalItemsCount;
        if (utils.isInWix()) {

          //data to be read by the fullscreen iframe
          window.onunload = function () {
            if (utils.isVerbose()) { //todo yoshi
              console.log('Fullscreen iFrame unloaded');
            }
          };

          let connectedProviders = null;
          let watermarkData = null;

          if (utils.isStoreGallery()) {
            watermarkData = this.props.watermarkData;
            connectedProviders = this.getConnectedProviders();
          }

          Wix.Styles.getStyleId(styleId => {
            utils.getWorkerWindow()['pro-gallery-data-' + this.compId] = {
              info: {
                config,
                itemIdx,
                itemId: item.id,
                compId: this.compId,
                pageId: this.pageId,
                galleryId: this.galleryId,
                styleId,
                watermarkData,
                connectedProviders,
                dateCreated: utils.getDateCreatedTicksFromStr(window.dateCreated),
              },
              items: {
                galleryStructure: this.galleryStructure,
                totalItemsCount: this.state.totalItemsCount,
                currentGalleryItems: this.allItems(),
              },
              window: {
                infiniteScrollUrl: window.infiniteScrollUrl,
                instance: window.instance
              }
            };

            //always open the default fullscreen - then read the window date and use replace state to change the url
            //this prevents the iframe from being refreshed

            utils.getWorkerWindow()['pro-gallery-fullscreen-comp-id'] = this.compId;

            Wix.Utils.navigateToSection({
              sectionId: utils.getFullscreenSectionId(),
              noTransition: true
            }, '');
          });

        } else {
          const fullscreen = document.getElementById('gallery-fullscreen');
          if (fullscreen) {
            this.fullscreenElem = React.createElement(FullscreenContainer, {
              demoModeParams: {
                items: this.allItems(),
                galleryStructure: this.galleryStructure,
                item: itemIdx,
                closeFullscreenCallback: this.closeFullscreenCallback
              },
              store: this.props.store
            });
            ReactDOM.render(this.fullscreenElem, fullscreen);
            window.history.pushState({}, '', utils.addItemHashParam(window.location.href, this.props.items[itemIdx].photoId));
          }

          if (!utils.isSemiNative()) {
            $('#fullscreen, #gallery-fullscreen').show();
            $('#content').hide();
          }
        }
      }
      logger.track('expand', {selection: 'expand'});
    }
  }

  pauseAllVideos() {
    window.dispatchEvent(this.pauseAllVideosEvent);
  }

  closeFullscreenCallback() {

    if (utils.isDev()) {
      console.log('Fullscreen closed callback');
    }

    const fullscreenData = (utils.getWorkerWindow()['pro-gallery-data-' + this.compId] || {}).fullscreenData;

    if (!fullscreenData) {
      console.warn('Closed fullscreen without data');
      return;
    }

    const items = this.resetItems(fullscreenData.currentGalleryItems);

    if (!utils.isSemiNative()) {
      $('#content').show();
    }

    //get current items from window - it was placed there by the fullscreen
    utils.setStateAndLog(this, 'Fullscreen Callback', {
      items
    });

    this.shouldScrollTo = fullscreenData.currentGalleryItemIdx;

    this.scrollToItemIfNeeded();

    //state might not be changed but the gallery must be rerendred (for loves counts)
    //this.forceUpdate();
  }

  //---------------------------------------| MULTISHARE |-----------------------------------------//

  initHashtagFilter(callback) {

    const hashtagFilter = this.getHashtagFilter();

    const hashtag = {
      filter: hashtagFilter
    };

    //get the items for the hashtag
    if (hashtagFilter) {
      if (!utils.isSemiNative()) {
        $.get(`${utils.getApiUrlPrefix()}gallery/${this.galleryId}/hashtags/${hashtagFilter}/items?instance=${window.instance}`, res => {
          if (res && res.items && res.items.length > 0) {
            hashtag.items = res.items;
            if (utils.isVerbose()) { //todo yoshi
              console.log('Got hashtag items', hashtag);
            }
            utils.setStateAndLog(this, 'Get Hashtag Items', {
              hashtag
            }, () => {
              if (callback && _.isFunction(callback)) {
                callback();
              }
            });
          }
        });
      }
    }
  }

  getHashtagFilter() {
    const hashtag = this.state.hashtagFilter || utils.getWorkerWindow()['pro-gallery-hashtag-filter'] || utils.parseGetParam('ht', itemActions.getSiteUrl());
    return hashtag;
  }

  sortItemsByHashtag(curItems) {

    const hashtagItems = _.get(this, 'state.hashtag.items');

    if (!hashtagItems) {
      return curItems;
    }

    /*
        const taggedItems = [], otherItems = [];
        for (const itemDto, i = 0; itemDto = curItems[i]; i++) {
          const isInHashtag = _.findIndex(hashtagItems, (item) => (item.itemId == itemDto.itemId)) >= 0;
          if (isInHashtag) {
            taggedItems.push(itemDto);
          } else {
            otherItems.push(itemDto);
          }
        }

        curItems = _.concat(_.sortBy(taggedItems, (item) => item.orderIndex), otherItems);
     */

    try {
      const otherItems = _.differenceBy(curItems, hashtagItems, 'itemId');
      return _.concat(hashtagItems, otherItems);
    } catch (e) {
      console.warn('Could not sort hashtag items', e, hashtagItems, curItems);
      return curItems;
    }
  }

  updateMultishareItems(event) {
    if (utils.isVerbose()) { //todo yoshi
      console.log('multishare pubsub', event);
    }
    const data = event.data;
    if (_.isBoolean(data.update) && data.update === true && _.isArray(data.items)) {
      utils.setStateAndLog(this, 'updateMultishareItems', {
        multishare: {
          items: data.items,
          isMultisharing: (this.props.defaultSelectMode === true || !!data.items.length)
        }
      });
    }
  }

  addItemToMultishare(itemDto) {
    if (utils.isInWix()) {
      itemDto.compId = this.compId; //add a refernce to the gallery that started this share
      Wix.PubSub.publish('gallery2multishare', {call: 'addItemToMultishare', data: (itemDto)}, true);
    } else {
      this.onItemClickEvent.itemId = itemDto.id;
      window.dispatchEvent(this.onItemClickEvent);

      utils.setStateAndLog(this, 'updateMultishareItems', {
        multishare: {
          items: this.state.multishare.items.concat([itemDto]),
          isMultisharing: true
        }
      });
    }
  }

  removeItemFromMultishare(itemProps) {
    if (utils.isInWix()) {
      Wix.PubSub.publish('gallery2multishare', {call: 'removeItemFromMultishare', data: (itemProps)}, true);
    } else {
      let multishareItems = this.state.multishare.items;
      multishareItems = _.filter(multishareItems, item => {
        return (
          (item.itemId || item.photoId) !== (itemProps.itemId || itemProps.photoId)
        );
      });
      utils.setStateAndLog(this, 'updateMultishareItems', {
        multishare: {
          items: multishareItems,
          isMultisharing: true
        }
      });
    }

  }

  //-----------------------------------------| RENDER |--------------------------------------------//

  static convertToGalleryItems(galleryStructure, itemConfig = {}) {
    if (utils.isVerbose()) {
      console.log('Layouter - convertToGalleryItems - START', _.cloneDeep(galleryStructure));
      console.time('Layouter - convertToGalleryItems');
    }
    let pointer = 0;
    for (let c = 0; c < galleryStructure.columns.length; c++) {
      const column = galleryStructure.columns[c];
      for (let g = 0; g < column.length; g++) {
        const group = column[g];
        if (!group.isGalleryGroup) {
          const groupItems = [];
          for (let i = 0; i < group.items.length; i++) {
            const item = group.items[i];
            if (!item.isGalleryItem) {
              groupItems[i] = new GalleryItem(_.merge({scheme: item.scheme, dto: item.dto}, itemConfig));
            } else {
              groupItems[i] = group.items[i];
            }
            galleryStructure.items[item.idx] = groupItems[i];
            pointer++;
          }
          column[g] = new GalleryGroup({scheme: group.scheme, dto: group.dto, items: groupItems});
        }
      }
    }

    if (utils.isVerbose()) {
      console.log('Layouter - convertToGalleryItems - END', _.cloneDeep(galleryStructure));
      console.timeEnd('Layouter - convertToGalleryItems');
    }
    return galleryStructure;
  }

  createGalleryStructure(structureState) {

    const getState = (key, defaultValue) => _.get(structureState, key) || this.getLatestState(key, defaultValue);

    //either create a new gallery or rerender the existing (if a substential change happend) or just set visibilities (on scroll)
    const layoutParams = {
      items: this.items.slice(0, getState('renderedItemsCount', 50)),
      container: getState('container'),
      styleParams: getState('styleParams'),
      gotScrollEvent: getState('gotScrollEvent')
    };

    if (utils.isVerbose()) {
      console.count('galleryContainer createGalleryStructure');
      console.log('creating Gallery Structure', layoutParams);
    }

    let galleryStructure = this.galleryStructure;

    if (!this.galleryStructure.ready) {

      if (utils.isVerbose()) {
        console.time('Recalculating Gallery - new');
      }
      const layout = (new Layouter(layoutParams));
      galleryStructure = GalleryContainer.convertToGalleryItems(layout, {watermark: this.props.watermarkData});
      if (utils.isVerbose()) {
        console.timeEnd('Recalculating Gallery - new');
      }

    } else if (this.renderTrigger === this.renderTriggers.SCROLL) {

      if (utils.isVerbose()) {
        console.time('Recalculating Gallery - visibilities');
      }
      galleryStructure.calcVisibilities(getState('container.bounds'));
      if (utils.isVerbose()) {
        console.timeEnd('Recalculating Gallery - visibilities');
      }

    } else {

      //recalculate gallery only if a crucial field has change
      //when only scrolling, and items don't change - do not recalculate the gallery object

      if (utils.isVerbose()) {
        console.time('Recalculating Gallery - prepare');
      }
      galleryStructure.createLayout(layoutParams);
      galleryStructure.calcVisibilities(getState('container.bounds'));
      galleryStructure = GalleryContainer.convertToGalleryItems(galleryStructure, {watermark: this.props.watermarkData});
      if (utils.isVerbose()) {
        console.timeEnd('Recalculating Gallery - prepare');
      }

    }

    window.galleryStructure = galleryStructure; //save on window for fullscreen access

    return galleryStructure;
  }

  reRenderForEditMode() {

    if (utils.isDev()) {console.count("galleryContainer reRenderForEditMode");}

    utils.updateViewMode();
    this.reRender(this.renderTriggers.MODE);
  }

  reRenderForSettings() {
    if (utils.isDev()) {console.count("galleryContainer reRenderForSettings");}

    this.reRender(this.renderTriggers.STYLES);
  }

  reRenderForStyles() {

    if (utils.isDev()) {console.count("galleryContainer reRenderForStyles");}

    Wix.Styles.getStyleParams(style => {
      window.postMessage({
        type: Wix.Events.STYLE_PARAMS_CHANGE,
        payload: style
      }, utils.getUrlPrefix());
    });
    this.reRender(this.renderTriggers.STYLES);
  }

  reRenderForScroll(params) {
    if (this.state.styleParams.oneRow) {
      return true;
    }

    if (utils.isVerbose()) { //todo yoshi
      console.count('galleryContainer reRenderForScroll');
      console.log('SCROLL - got vertical scroll event', params);
    }

    this._reRenderForScroll(params);
  }

  reRenderForHorizontalScroll(event) {

    const isScrollingHorizontalGallery = this.state.styleParams.oneRow && event.target.className.indexOf('gallery-horizontal-scroll') >= 0;

    if (isScrollingHorizontalGallery) {

      if (utils.isVerbose()) { //todo yoshi
        console.count('galleryContainer reRenderForHorizontalScroll');
        console.log('SCROLL - got horizontal scroll event');
      }

      this._reRenderForScroll();
    }

    return true; //continue with native scroll event

  }

  _reRenderForScroll(params) {

    if (utils.shouldLog('scroll')) {
      this.debugScroll = Date.now();
      console.time('SCROLL - full cycle time');
      console.time('SCROLL - js logic time');
    }

    window.dispatchEvent(this.galleryScrollEvent);

    this.reRender(this.renderTriggers.SCROLL, params);
  }

  reRenderForResize(e) {
    if (utils.isVerbose()) { //todo yoshi
      if (!utils.isSemiNative()) {
        console.log(`Got resize event (${this.lastWindowHeight} > ${window.innerHeight})`, e);
      }
      console.count('galleryContainer reRenderForResize');
    }

    if (this.heightWasSetInternally === true) {
      //disable reRender for resize when calling wix.setHeight
      this.heightWasSetInternally = false;
      if (!this.state.styleParams.oneRow) {
        if (utils.isVerbose()) {
          console.warn('Not reRendering on resize event after Wix.setHeight was called!', e);
        }
        // todo - removed return when checking it does not affect the editor
        // return;
      }
    }

    this.lastWindowHeight = this.getGalleryHeight();

    this.resizeCount = this.resizeCount + 1;
    this.reRender(this.renderTriggers.RESIZE);
  }

  reRenderForOrientation() {

    if (utils.isVerbose()) { //todo yoshi
      console.count('galleryContainer reRenderForOrientation');
    }

    const reRenderForOrientationInternal = () => {
      this.orientationCount = this.orientationCount + 1;
      utils.fixViewport('Gallery orientation');
      this.reRender(this.renderTriggers.ORIENTATION);
      if (utils.getViewModeFromCache() !== 'editor') {
        Wix.scrollBy(0, 1); //patch to get the right scroll position
      }
    };

    reRenderForOrientationInternal();
  }

  reRender(trigger, params) {

    const {ALL, STYLES, RESIZE, ORIENTATION, LAYOUT, MODE, SCROLL, ITEMS, NONE} = this.renderTriggers;

    if (utils.isVerbose()) { //todo yoshi
      console.count('galleryContainer reRender');
      console.count('reRendering (trigger: ' + trigger + ')');
      console.log('reRendering', trigger, params);
    }

    const triggerIs = triggerTypes => {
      if (!_.isArray(triggerTypes)) {
        triggerTypes = [triggerTypes];
      }
      return (trigger === ALL) || (_.indexOf(triggerTypes, trigger) >= 0);
    };

    //------| SCROLL STATE |------//
    this.getGalleryScroll(params);
    const scrollState = {
      scroll: _.merge(this.state.scroll, {top: this.currentScrollPosition, base: this.scrollBase}),
      container: _.merge(this.state.container, this.getVisibleBounds(this.currentScrollPosition, this.pageScale)),
      gotScrollEvent: this.state.gotScrollEvent || triggerIs(SCROLL)
    };
    this.newState = scrollState;

    //------| STYLES STATE |------//
    const stylesState = {styleParams: (triggerIs(STYLES) ? this.getStyleParamsState() : this.state.styleParams)};
    const isNewLayout = triggerIs(STYLES) && stylesState.styleParams && this.state.styleParams && (stylesState.styleParams.selectedLayout !== this.state.styleParams.selectedLayout);
    if (isNewLayout) {trigger = LAYOUT;}
    this.newState.styleParams = stylesState.styleParams;

    //------| RESIZE STATE |------//
    const shouldGetNewGalleryDimensions = triggerIs([STYLES, RESIZE, ORIENTATION, LAYOUT]);
    const resizeState = {
      container: shouldGetNewGalleryDimensions ? this.getGalleryDimensions(stylesState.styleParams) : this.state.container
    };
    if (shouldGetNewGalleryDimensions) {_.merge(this.newState.container, resizeState.container);}

    //------| VIEW STATE |------//
    let viewState = {};
    if (triggerIs(MODE)) {
      viewState = {container: {viewMode: (utils.isInWix() ? utils.getViewModeFromCache() : 'view')}};
      _.merge(this.newState.container, viewState.container);
    }

    //------| TOTAL ITEMS |------//
    const shouldGetVisibleItems = triggerIs([MODE, SCROLL, RESIZE, ORIENTATION, STYLES, LAYOUT]);
    const totalItems = shouldGetVisibleItems ? this.findVisibleItems() : this.allItems();

    //------| DB ITEMS |------//
    if (this.debugScroll) {console.time('SCROLL - time of getRequiredItemsFromDbIfNeeded');}
    this.getRequiredItemsFromDbIfNeeded(totalItems, res => {
      if (this.debugScroll) {console.timeEnd('SCROLL - time of getRequiredItemsFromDbIfNeeded');}

      let itemsState = {};
      if (res.items.length > 0) {
        if (this.items.length > this.state.renderedItemsCount) {
          //there are more items in memory than rendered
          itemsState = {
            items: this.state.items,
            renderedItemsCount: this.state.renderedItemsCount + res.items.length,
            totalItemsCount: res.totalItemsCount
          };
        } else {
          this.items = this.concatNewItems(res.items);
          itemsState = {
            items: this.itemsIds(this.items),
            renderedItemsCount: this.items.length,
            totalItemsCount: res.totalItemsCount
          };
        }
        _.merge(this.newState, itemsState);

        // allItems = this.sortItemsByHashtag(allItems); //assuming all hashtag items are fetched with prerenderedItems - better perfomance

        //if the items where changed - change the trigger
        if (this.items.length !== this.state.renderedItemsCount) {
          trigger = ITEMS;
        }
      }

      this.renderTrigger = trigger;

      // if (this.debugScroll) console.time('SCROLL - cloning newState');
      // let newState = _.cloneDeep(this.state);
      // if (this.debugScroll) console.timeEnd('SCROLL - cloning newState');
      // let newState = {};
      // if (this.debugScroll) console.time('SCROLL - (' + trigger + ') merging newState');
      // switch (trigger) {
      //   case NONE:
      //     break;
      //   case MODE:
      //     newState = utils.mergeDeep(scrollState, viewState);
      //     break;
      //   case STYLES:
      //   case LAYOUT:
      //     newState = utils.mergeDeep(scrollState, stylesState, resizeState);
      //     break;
      //   case RESIZE:
      //   case ORIENTATION:
      //     newState = utils.mergeDeep(scrollState, resizeState);
      //     break;
      //   case SCROLL:
      //     newState = scrollState;
      //     break;
      //   case ALL:
      //   case ITEMS:
      //   default:
      //     newState = utils.mergeDeep(stylesState, scrollState, viewState, resizeState, itemsState);
      //     break;
      // }
      // if (this.debugScroll) console.timeEnd('SCROLL - (' + trigger + ') merging newState');
      if (this.debugScroll) {console.time('SCROLL - (' + trigger + ') create new gallery');}

      // this.newState = newState;
      this.galleryStructure = this.createGalleryStructure();

      if (this.debugScroll) {console.timeEnd('SCROLL - (' + trigger + ') create new gallery');}
      if (this.debugScroll) {console.time('SCROLL - (' + trigger + ') time of setting new state for gallery');}

      const isLayoutDefined = layout => (layout && layout.replace(/(undefined)[|]?/g, '') !== '');
      const isChangedLayout = isNewLayout && isLayoutDefined(this.newState.styleParams.selectedLayout) && isLayoutDefined(this.state.styleParams.selectedLayout); //used to prevent setting height on first layout reRender

      utils.setStateAndLog(this, 'Gallery ReRender', this.newState, () => {
        if (this.debugScroll) {console.timeEnd('SCROLL - (' + trigger + ') time of setting new state for gallery');}
        if (this.debugScroll) {console.timeEnd('SCROLL - full cycle time');}
        if ((this.isInfiniteScroll() && !this.state.styleParams.oneRow) || trigger !== LAYOUT || isChangedLayout) {
          // auto change height when:
          //  - Vertical gallery with infinite scroll
          //  - Changed layout in the editor
          //  - The trigger is not a new layout
          // (this is used to prevent auto change of height when the editor loads)
          this.setWixHeight(this.galleryStructure.height, Math.round(this.getGalleryHeight()), trigger);
        }

        if (isNewLayout && utils.isEditor()) {this.scrollToItem(0);} //in the editor, the layout change can be triggered by the settings, so we need to scroll to the first item. In sites, this is triggered once on load and the scroll is unneccessary (could cause problem with anchors_
      });

      const {actions} = this.props;
      switch (trigger) {
        case SCROLL:
          if (params && actions.galleryWindowLayoutChanged) {
            actions.galleryWindowLayoutChanged(params);
          }
          break;
        case MODE:
          actions.editorModeChanged();
          break;
        case STYLES:
          actions.videoPlayModeChanged(this.newState.styleParams.videoPlay);
          break;
      }
    });

    this.scrollToItemIfNeeded();

  }

  shouldRender() {

    if (utils.isVerbose()) { //todo yoshi
      console.count('galleryContainer shouldRender');
    }

    const state = this.state;

    if (_.get(state, 'styleParams.gotStyleParams') === false) {
      if (utils.isVerbose()) { //todo yoshi
        console.warn('Could not render gallery - did not get style params', state.styleParams);
      }
      return false;
    }

    if (_.get(state, 'container.galleryWidth') <= 0) {
      if (utils.isVerbose()) { //todo yoshi
        console.warn('Could not render gallery - width is 0');
      }
      return false;
    }

    if (!this.galleryStructure.ready) {
      if (utils.isVerbose()) { //todo yoshi
        console.warn('Could not render gallery - preparation failed', state.galleryStructure.reason);
      }
      setTimeout(() => {
        if (!this.galleryStructure.ready) {
          console.error('galleryStructure.ready === false');
        }
      }, 4000);
      return false;
    }

    return true;
  }

  render() {

    if (!this.shouldRender()) {
      return false;
    }

    if (utils.isVerbose()) { //todo yoshi
      console.count('galleryContainer render');
      console.timeEnd('SCROLL - js logic time');
    }

    return this.shouldRender() && (
      this.state.styleParams.oneRow ?
      <SlideshowView
            totalItemsCount={this.state.totalItemsCount}
            renderedItemsCount={this.state.renderedItemsCount}
            items={this.currentItems()}
            galleryStructure={this.galleryStructure}
            styleParams={this.state.styleParams}
            container={this.state.container}
            scroll={_.merge({}, this.state.scroll, {isInfinite: this.isInfiniteScroll()})}
            thumbnailSize={this.thumbnailSize}
            multishare={this.state.multishare}
            watermark={this.props.watermarkData}
            gotScrollEvent={this.state.gotScrollEvent}
            convertToGalleryItems={GalleryContainer.convertToGalleryItems}
            actions={_.merge(this.props.actions, {
              toggleInfiniteScroll: this.toggleInfiniteScroll,
              toggleFullscreen: this.toggleFullscreen,
              pauseAllVideos: this.pauseAllVideos,
              setWixHeight: this.setWixHeight,
              scrollToItem: this.scrollToItem,
              addItemToMultishare: this.addItemToMultishare,
              removeItemFromMultishare: this.removeItemFromMultishare
            })}
            debug={{
              lastHeight: this.lastHeight,
              newHeight: this.newHeight,
              resizeCount: this.resizeCount,
              orientationCount: this.orientationCount,
              maxGalleryWidth: this.props.maxGalleryWidth
            }}
            store={this.props.store}
            {...this.props.gallery}
          /> :
      <GalleryView
            totalItemsCount={this.state.totalItemsCount}
            renderedItemsCount={this.state.renderedItemsCount}
            items={this.currentItems()}
            galleryStructure={this.galleryStructure}
            styleParams={this.state.styleParams}
            container={this.state.container}
            scroll={_.merge({}, this.state.scroll, {isInfinite: this.isInfiniteScroll()})}
            multishare={this.state.multishare}
            watermark={this.props.watermarkData}
            gotScrollEvent={this.state.gotScrollEvent}
            actions={_.merge(this.props.actions, {
              toggleInfiniteScroll: this.toggleInfiniteScroll,
              toggleFullscreen: this.toggleFullscreen,
              pauseAllVideos: this.pauseAllVideos,
              setWixHeight: this.setWixHeight,
              scrollToItem: this.scrollToItem,
              addItemToMultishare: this.addItemToMultishare,
              removeItemFromMultishare: this.removeItemFromMultishare
            })}
            debug={{
              lastHeight: this.lastHeight,
              newHeight: this.newHeight,
              resizeCount: this.resizeCount,
              orientationCount: this.orientationCount,
              maxGalleryWidth: this.props.maxGalleryWidth
            }}
            store={this.props.store}
            {...this.props.gallery}
          />
    );
  }

}

function mapStateToProps(state) {
  return state.gallery;
}

function mapDispatchToProps(dispatch) {
  return {
    actions: bindActionCreators(actions, dispatch)
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(GalleryContainer);