import type {
  PPTXSlide,
  PPTXElement,
  PPTXTextElement,
  PPTXImageElement,
  PPTXShapeElement,
  PPTXVideoElement
} from '../types';
import { createShapeElement } from './shapes';

/**
 * PPTX渲染器
 */
export class PPTXRenderer {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * 渲染幻灯片
   */
  renderSlide(slide: PPTXSlide): void {
    this.container.innerHTML = '';
    const slideEl = this.createSlideElement(slide);
    this.container.appendChild(slideEl);
  }

  /**
   * 创建幻灯片元素
   */
  private createSlideElement(slide: PPTXSlide): HTMLElement {
    const slideEl = document.createElement('div');
    slideEl.className = 'pptx-slide';
    slideEl.style.position = 'relative';
    slideEl.style.width = `${slide.width}px`;
    slideEl.style.height = `${slide.height}px`;
    slideEl.style.backgroundColor = slide.background?.color || '#ffffff';
    slideEl.style.overflow = 'hidden';

    // 渲染所有元素
    slide.elements.forEach((element) => {
      const elementEl = this.renderElement(element);
      if (elementEl) {
        slideEl.appendChild(elementEl);
      }
    });

    return slideEl;
  }

  /**
   * 渲染元素
   */
  private renderElement(element: PPTXElement): HTMLElement | null {
    switch (element.type) {
      case 'text':
        return this.renderTextElement(element as PPTXTextElement);
      case 'image':
        return this.renderImageElement(element as PPTXImageElement);
      case 'shape':
        return this.renderShapeElement(element as PPTXShapeElement);
      case 'video':
        return this.renderVideoElement(element as PPTXVideoElement);
      default:
        return null;
    }
  }

  /**
   * 渲染文本元素
   */
  private renderTextElement(element: PPTXTextElement): HTMLElement {
    const textEl = document.createElement('div');
    textEl.className = 'pptx-text';
    textEl.style.position = 'absolute';
    textEl.style.left = `${element.x}px`;
    textEl.style.top = `${element.y}px`;
    textEl.style.width = `${element.width}px`;
    textEl.style.height = `${element.height}px`;
    textEl.style.overflow = 'hidden';

    // 默认居中对齐
    textEl.style.display = 'flex';
    textEl.style.alignItems = 'center';
    textEl.style.justifyContent = 'center';

    // 应用样式
    const style = element.style || {};
    if (style.fontSize) {
      textEl.style.fontSize = `${style.fontSize}px`;
    }
    if (style.fontFamily) {
      textEl.style.fontFamily = style.fontFamily;
    }
    if (style.bold) {
      textEl.style.fontWeight = 'bold';
    }
    if (style.italic) {
      textEl.style.fontStyle = 'italic';
    }
    if (style.underline) {
      textEl.style.textDecoration = 'underline';
    }
    // 水平对齐：覆盖默认的居中
    if (style.align) {
      textEl.style.justifyContent =
        style.align === 'left'
          ? 'flex-start'
          : style.align === 'right'
            ? 'flex-end'
            : 'center';
      textEl.style.textAlign = style.align;
    }
    // 垂直对齐：覆盖默认的居中
    if (style.verticalAlign) {
      textEl.style.alignItems =
        style.verticalAlign === 'top'
          ? 'flex-start'
          : style.verticalAlign === 'bottom'
            ? 'flex-end'
            : 'center';
    }

    // 如果有文本片段（每个片段可能有不同的颜色），则分别渲染
    if (element.fragments && element.fragments.length > 0) {
      // 检查是否有不同的颜色或背景色
      let hasDifferentStyles = false;
      const firstColor = element.fragments[0]?.color;
      const firstBgColor = element.fragments[0]?.backgroundColor;

      for (const fragment of element.fragments) {
        if (
          fragment.color !== firstColor ||
          fragment.backgroundColor !== firstBgColor
        ) {
          hasDifferentStyles = true;
          break;
        }
      }

      if (hasDifferentStyles) {
        // 每个片段使用span包裹，应用不同的颜色和背景色
        const fragmentContainer = document.createElement('span');
        for (const fragment of element.fragments) {
          const span = document.createElement('span');
          span.textContent = fragment.text;
          if (fragment.color) {
            span.style.color = fragment.color;
          } else {
            span.style.color = style.color || '#000000';
          }
          if (fragment.backgroundColor) {
            span.style.backgroundColor = fragment.backgroundColor;
            span.style.padding = '0 2px'; // 添加一些内边距让背景色更好看
          }
          fragmentContainer.appendChild(span);
        }
        textEl.appendChild(fragmentContainer);
      } else {
        // 所有片段样式相同，使用单一样式渲染
        const color = element.fragments[0]?.color || style.color || '#000000';
        textEl.style.color = color;
        if (element.fragments[0]?.backgroundColor) {
          textEl.style.backgroundColor = element.fragments[0].backgroundColor;
          textEl.style.padding = '0 4px';
        }
        if (element.text) {
          textEl.textContent = element.text;
        } else {
          textEl.textContent = '';
        }
      }
    } else {
      // 没有片段信息，使用原有逻辑
      textEl.style.color = style.color || '#000000';
      if (element.text) {
        textEl.textContent = element.text;
      } else {
        textEl.textContent = '';
      }
    }

    return textEl;
  }

  /**
   * 渲染图片元素
   */
  private renderImageElement(element: PPTXImageElement): HTMLElement {
    const imgEl = document.createElement('img');
    imgEl.className = 'pptx-image';
    imgEl.style.position = 'absolute';
    imgEl.style.left = `${element.x}px`;
    imgEl.style.top = `${element.y}px`;
    imgEl.style.width = `${element.width}px`;
    imgEl.style.height = `${element.height}px`;
    imgEl.style.objectFit = 'cover';
    imgEl.src = element.src;

    return imgEl;
  }

  /**
   * 渲染形状元素
   */
  private renderShapeElement(element: PPTXShapeElement): HTMLElement {
    // 尝试使用SVG渲染复杂形状
    if (element.shapeType) {
      const svgElement = createShapeElement(
        element.shapeType,
        element.width,
        element.height,
        element.fill,
        element.stroke,
        element.strokeWidth
      );

      if (svgElement) {
        // SVG渲染成功，包装在容器中
        const container = document.createElement('div');
        container.className = 'pptx-shape';
        container.style.position = 'absolute';
        container.style.left = `${element.x}px`;
        container.style.top = `${element.y}px`;
        container.style.width = `${element.width}px`;
        container.style.height = `${element.height}px`;
        container.appendChild(svgElement);
        return container;
      }
    }

    // 回退到原有的CSS渲染方式（用于简单形状）
    // 预先检测是否为圆环，用于位置调整
    const isDonutCandidate =
      element.shapeType === 'ellipse' ||
      element.shapeType === 'oval' ||
      element.shapeType === 'custom';
    const hasNoFill = !element.fill && !element.gradient;
    const hasStroke = !!element.stroke;
    let isDonut = isDonutCandidate && hasNoFill && hasStroke;

    // 圆环的border宽度（用于位置补偿）
    let borderWidth =
      isDonut && element.strokeWidth && element.strokeWidth > 0
        ? element.strokeWidth
        : 0;

    const shapeEl = document.createElement('div');
    shapeEl.className = 'pptx-shape';
    shapeEl.style.position = 'absolute';
    shapeEl.style.left = `${element.x}px`;
    shapeEl.style.top = `${element.y}px`;
    shapeEl.style.width = `${element.width}px`;
    shapeEl.style.height = `${element.height}px`;

    // 根据形状类型应用对应的样式
    if (element.shapeType) {
      const shapeType = element.shapeType.toLowerCase();
      // 圆形或椭圆形需要圆角
      if (shapeType === 'ellipse' || shapeType === 'oval') {
        shapeEl.style.borderRadius = '50%';
      } else if (
        shapeType === 'roundRectangle' ||
        shapeType === 'roundedRectangle'
      ) {
        shapeEl.style.borderRadius = '10%';
      } else if (shapeType === 'custom') {
        // 自定义几何形状，可能是圆环等复杂形状
        shapeEl.style.borderRadius = '50%';
        isDonut = true;
      }
    }

    // 应用渐变或纯色填充
    if (isDonut && element.stroke) {
      // 圆环：使用边框实现
      // 优先使用实际解析的strokeWidth，只在无效时才使用尺寸的1/8作为后备
      if (element.strokeWidth && element.strokeWidth > 0) {
        borderWidth = element.strokeWidth;
      } else {
        borderWidth = Math.max(1, Math.min(element.width, element.height) / 8);
      }

      // 圆环：使用 content-box，border 向外扩展
      // 为保持外径和填充圆相同，需要向内收缩内容尺寸
      // 因为 border 会向外扩展 borderWidth * 2，所以内容尺寸要减小 borderWidth * 2
      const donutContentWidth = element.width - borderWidth * 2;
      const donutContentHeight = element.height - borderWidth * 2;

      shapeEl.style.left = `${element.x}px`;
      shapeEl.style.top = `${element.y}px`;
      shapeEl.style.width = `${donutContentWidth}px`;
      shapeEl.style.height = `${donutContentHeight}px`;
      shapeEl.style.border = `${borderWidth}px solid ${element.stroke}`;
      shapeEl.style.backgroundColor = 'transparent';
    } else if (element.gradient) {
      const { type, colors, angle } = element.gradient;
      if (type === 'linear' && colors.length >= 2) {
        // 创建CSS线性渐变
        const colorStops = colors
          .map((c) => `${c.color} ${c.pos / 1000}%`)
          .join(', ');
        // 转换角度：PPTX角度需要调整以匹配CSS
        const cssAngle = (angle || 90) + 90;
        shapeEl.style.background = `linear-gradient(${cssAngle}deg, ${colorStops})`;
      } else if (colors.length > 0) {
        // 只有一种颜色，使用纯色
        shapeEl.style.backgroundColor = colors[0].color;
      }
    } else if (element.fill) {
      shapeEl.style.backgroundColor = element.fill;
    }

    // 如果不是圆环，单独应用描边
    if (!isDonut && element.stroke) {
      shapeEl.style.border = `${element.strokeWidth || 1}px solid ${element.stroke}`;
    }

    return shapeEl;
  }

  /**
   * 渲染视频元素
   */
  private renderVideoElement(element: PPTXVideoElement): HTMLElement {
    const videoContainer = document.createElement('div');
    videoContainer.className = 'pptx-video-container';
    videoContainer.style.position = 'absolute';
    videoContainer.style.left = `${element.x}px`;
    videoContainer.style.top = `${element.y}px`;
    videoContainer.style.width = `${element.width}px`;
    videoContainer.style.height = `${element.height}px`;
    videoContainer.style.overflow = 'hidden';
    videoContainer.style.backgroundColor = '#000';

    const videoEl = document.createElement('video');
    videoEl.className = 'pptx-video';
    videoEl.style.width = '100%';
    videoEl.style.height = '100%';
    videoEl.style.objectFit = 'contain';
    videoEl.controls = true;
    videoEl.preload = 'metadata';

    if (element.src) {
      videoEl.src = element.src;
    }

    if (element.poster) {
      videoEl.poster = element.poster;
    }

    videoContainer.appendChild(videoEl);

    return videoContainer;
  }
}
