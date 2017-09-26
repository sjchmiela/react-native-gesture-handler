// @flow
import React, { Component } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import {
  PanGestureHandler,
  TapGestureHandler,
  State,
} from 'react-native-gesture-handler';

const MIN_SWIPE_DISTANCE = 3;

const IDLE = 'Idle';
const DRAGGING = 'Dragging';
const SETTLING = 'Settling';

export type PropType = {
  children: any,
  drawerBackgroundColor?: string,
  drawerLockMode?: 'unlocked' | 'locked-closed' | 'locked-open',
  drawerPosition: 'left' | 'right',
  drawerWidth: number,
  keyboardDismissMode?: 'none' | 'on-drag',
  onDrawerClose?: Function,
  onDrawerOpen?: Function,
  onDrawerSlide?: Function,
  onDrawerStateChanged?: Function,
  renderNavigationView: () => any,
  statusBarBackgroundColor?: string,
  useNativeAnimations?: boolean,
};

export type StateType = {
  accessibilityViewIsModal: boolean,
  drawerShown: boolean,
  openValue: any,
};

export type EventType = {
  stopPropagation: Function,
};

export type DrawerMovementOptionType = {
  velocity?: number,
};

const MARGIN = 25;

export default class DrawerLayout extends Component {
  props: PropType;
  state: StateType;

  static defaultProps = {
    drawerWidth: 0,
    drawerPosition: 'left',
    useNativeAnimations: true,
  };

  static positions = {
    Left: 'left',
    Right: 'right',
  };

  constructor(props: PropType, context: any) {
    super(props, context);

    const fromLeft = props.drawerPosition === 'left';

    const dragX = new Animated.Value(0);
    const drawerPosition = new Animated.Value(0);

    const openValue = Animated.add(dragX, drawerPosition).interpolate({
      inputRange: fromLeft ? [0, props.drawerWidth] : [-props.drawerWidth, 0],
      outputRange: fromLeft ? [0, 1] : [1, 0],
      extrapolate: 'clamp',
    });

    this.state = {
      dragX,
      drawerPosition,
      openValue,
      drawerShown: false,
    };

    this._onGestureEvent = Animated.event(
      [{ nativeEvent: { translationX: dragX } }],
      { useNativeDriver: props.useNativeAnimations }
    );
  }

  render() {
    const { accessibilityViewIsModal, drawerShown, openValue } = this.state;

    const { drawerBackgroundColor, drawerWidth, drawerPosition } = this.props;

    const fromLeft = drawerPosition === 'left';

    const dynamicDrawerStyles = {
      backgroundColor: drawerBackgroundColor,
      width: drawerWidth,
    };

    const drawerTranslateX = openValue.interpolate({
      inputRange: [0, 1],
      outputRange: [this._drawerClosedOffset(), 0],
      extrapolate: 'clamp',
    });
    const drawerStyles = {
      transform: [{ translateX: drawerTranslateX }],
      flexDirection: fromLeft ? 'row' : 'row-reverse',
    };

    const dragHandlerStyle = drawerShown
      ? styles.dragHandlerOpened
      : styles.dragHandler;

    /* Overlay styles */
    const overlayOpacity = openValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.7],
      extrapolate: 'clamp',
    });
    const animatedOverlayStyles = { opacity: overlayOpacity };

    return (
      <View style={styles.main}>
        {this.props.children}
        <Animated.View
          pointerEvents="none"
          style={[styles.overlay, animatedOverlayStyles]}
        />
        <PanGestureHandler
          minDeltaX={MIN_SWIPE_DISTANCE}
          onGestureEvent={this._onGestureEvent}
          onHandlerStateChange={this._onHandlerStateChange}>
          <Animated.View
            pointerEvents="box-none"
            accessibilityViewIsModal={accessibilityViewIsModal}
            style={[styles.drawerContainer, drawerStyles]}>
            <View style={[styles.drawer, dynamicDrawerStyles]}>
              {this.props.renderNavigationView()}
            </View>
            <TapGestureHandler
              onHandlerStateChange={this._onTapHandlerStateChange}>
              <View style={dragHandlerStyle} />
            </TapGestureHandler>
          </Animated.View>
        </PanGestureHandler>
      </View>
    );
  }

  _drawerClosedOffset = () => {
    const { drawerPosition, drawerWidth } = this.props;
    if (drawerPosition === 'left') {
      return -drawerWidth;
    } else {
      return drawerWidth;
    }
  };

  _onHandlerStateChange = ({ nativeEvent }) => {
    if (nativeEvent.oldState === State.ACTIVE) {
      this._handleRelease(nativeEvent);
    }
  };

  _onTapHandlerStateChange = ({ nativeEvent }) => {
    if (this.state.drawerShown && nativeEvent.oldState === State.ACTIVE) {
      this.closeDrawer();
    }
  };

  _handleRelease = nativeEvent => {
    const { drawerWidth } = this.props;
    const { drawerShown } = this.state;

    const dragToss = 0.05;
    const endOffsetX =
      nativeEvent.translationX + dragToss * nativeEvent.velocityX;

    const startOffsetX =
      nativeEvent.translationX +
      (drawerShown ? -this._drawerClosedOffset() : 0);

    const shouldFlip = Math.abs(endOffsetX) > drawerWidth / 2;
    const shouldOpen = shouldFlip ? !drawerShown : drawerShown;
    if (shouldOpen) {
      this._animateDrawer(
        startOffsetX,
        -this._drawerClosedOffset(),
        nativeEvent.velocityX
      );
    } else {
      this._animateDrawer(startOffsetX, 0, nativeEvent.velocityX);
    }
  };

  _animateDrawer = (fromValue: number, toValue: number, velocity: ?number) => {
    this.state.dragX.setValue(0);
    this.state.drawerPosition.setValue(fromValue);

    this.setState({ drawerShown: toValue !== 0 });
    Animated.spring(this.state.drawerPosition, {
      velocity,
      bounciness: 0,
      toValue,
      useNativeDriver: this.props.useNativeAnimations,
    }).start();
  };

  openDrawer = (options: DrawerMovementOptionType = {}) => {
    this._animateDrawer(0, -this._drawerClosedOffset(), options.velocity);
  };

  closeDrawer = (options: DrawerMovementOptionType = {}) => {
    this._animateDrawer(-this._drawerClosedOffset(), 0, options.velocity);
  };
}

const styles = StyleSheet.create({
  drawer: { flex: 0 },
  drawerContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1001,
    flexDirection: 'row',
  },
  main: {
    flex: 1,
    zIndex: 0,
  },
  dragHandler: {
    width: MARGIN,
  },
  dragHandlerOpened: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 1000,
  },
});
