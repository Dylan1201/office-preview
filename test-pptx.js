const JSZip = require('jszip');
const { DOMParser } = require('xmldom');

// 模拟浏览器环境
global.DOMParser = DOMParser;

// 导入解析器（需要先编译）
const { PPTXParser } = require('./packages/vue-pptx/lib/vue-office-pptx.umd.js');

async function testParsePPTX() {
  try {
    console.log('[Test] Fetching PPTX file...');
    
    // 获取 PPTX 文件
    const response = await fetch('http://localhost:6688/office/%E6%BC%94%E7%A4%BA%E6%96%87%E7%A8%BF1.pptx');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    console.log('[Test] PPTX file fetched successfully');
    
    const arrayBuffer = await response.arrayBuffer();
    console.log(`[Test] File size: ${arrayBuffer.byteLength} bytes`);
    
    // 解析 PPTX
    console.log('\n[Test] Starting PPTX parsing...\n');
    const parser = new PPTXParser();
    const presentation = await parser.parse(arrayBuffer);
    
    // 输出结果摘要
    console.log('\n========== PARSE SUMMARY ==========');
    console.log(`Total slides: ${presentation.slides.length}`);
    console.log(`Slide dimensions: ${presentation.width}x${presentation.height}`);
    
    presentation.slides.forEach((slide, index) => {
      console.log(`\n--- Slide ${index + 1} ---`);
      console.log(`Total elements: ${slide.elements.length}`);
      
      // 统计元素类型
      const typeCount = {};
      slide.elements.forEach(el => {
        typeCount[el.type] = (typeCount[el.type] || 0) + 1;
      });
      
      console.log('Element types:', typeCount);
      
      // 显示每个元素的详细信息
      slide.elements.forEach((el, idx) => {
        console.log(`  [${idx}] ${el.type} - x:${el.x}, y:${el.y}, w:${el.width}, h:${el.height}`);
        if (el.type === 'text') {
          console.log(`      text: "${el.text?.substring(0, 50)}..."`);
        } else if (el.type === 'shape') {
          console.log(`      shapeType: ${el.shapeType}, fill: ${el.fill || 'none'}, gradient: ${el.gradient ? 'yes' : 'no'}`);
        } else if (el.type === 'image') {
          console.log(`      src: ${el.src?.substring(0, 50)}...`);
        } else if (el.type === 'table') {
          console.log(`      rows: ${el.rows.length}, cols: ${el.columns?.length || 'unknown'}`);
        }
      });
    });
    
    console.log('\n========== PARSE COMPLETE ==========\n');
    
  } catch (error) {
    console.error('[Test] Error:', error);
    console.error(error.stack);
  }
}

testParsePPTX();
