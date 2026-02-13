/**
 * 独立的 PPTX 解析测试脚本
 * 直接在 Node.js 中运行，无需浏览器
 */

const JSZip = require('jszip');
const { DOMParser } = require('xmldom');

async function testPPTXParsing() {
  try {
    console.log('========================================');
    console.log('PPTX 解析测试脚本');
    console.log('========================================\n');
    
    // 1. 获取 PPTX 文件
    console.log('[1] 正在获取 PPTX 文件...');
    const response = await fetch('http://localhost:6688/office/%E6%BC%94%E7%A4%BA%E6%96%87%E7%A8%BF1.pptx');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log(`✓ 文件大小: ${arrayBuffer.byteLength} 字节\n`);
    
    // 2. 解压 PPTX
    console.log('[2] 正在解压 PPTX 文件...');
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // 列出所有文件
    const files = Object.keys(zip.files);
    console.log(`✓ 找到 ${files.length} 个文件\n`);
    
    // 显示关键文件
    const keyFiles = files.filter(f => 
      f.includes('slide') || 
      f.includes('theme') || 
      f.includes('presentation.xml')
    );
    console.log('关键文件:');
    keyFiles.forEach(f => console.log(`  - ${f}`));
    console.log();
    
    // 3. 获取幻灯片尺寸
    console.log('[3] 解析演示文稿尺寸...');
    const presentationFile = zip.file('ppt/presentation.xml');
    if (presentationFile) {
      const presXml = await presentationFile.async('string');
      const parser = new DOMParser();
      const doc = parser.parseFromString(presXml, 'text/xml');
      
      const slideSize = doc.getElementsByTagName('p:sldSz')[0] || 
                       doc.getElementsByTagName('sldSz')[0];
      
      if (slideSize) {
        const cx = parseInt(slideSize.getAttribute('cx') || '9144000');
        const cy = parseInt(slideSize.getAttribute('cy') || '5143500');
        const width = Math.round(cx / 914400 * 96);
        const height = Math.round(cy / 914400 * 96);
        console.log(`✓ 幻灯片尺寸: ${width}x${height} 像素\n`);
      }
    }
    
    // 4. 统计幻灯片
    console.log('[4] 统计幻灯片...');
    const slideFiles = files
      .filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'))
      .sort((a, b) => {
        const aNum = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0');
        const bNum = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0');
        return aNum - bNum;
      });
    
    console.log(`✓ 找到 ${slideFiles.length} 张幻灯片\n`);
    
    // 5. 分析每张幻灯片
    console.log('[5] 分析每张幻灯片的元素...\n');
    console.log('========================================\n');
    
    const parser = new DOMParser();
    
    for (let i = 0; i < slideFiles.length; i++) {
      const slideFile = slideFiles[i];
      const slideNum = i + 1;
      
      console.log(`📄 幻灯片 ${slideNum}: ${slideFile}`);
      
      try {
        const slideXml = await zip.file(slideFile).async('string');
        const doc = parser.parseFromString(slideXml, 'text/xml');
        
        // 查找 spTree
        let spTree = doc.getElementsByTagName('p:spTree')[0] ||
                    doc.getElementsByTagName('spTree')[0];
        
        if (!spTree) {
          const allElements = doc.getElementsByTagName('*');
          for (let j = 0; j < allElements.length; j++) {
            if (allElements[j].localName === 'spTree') {
              spTree = allElements[j];
              break;
            }
          }
        }
        
        if (!spTree) {
          console.log('  ⚠️  未找到 spTree 元素\n');
          continue;
        }
        
        // 统计各类元素
        const stats = {
          shapes: 0,
          pictures: 0,
          graphicFrames: 0,
          groupShapes: 0
        };
        
        // 统计形状
        let shapes = spTree.getElementsByTagName('p:sp');
        if (shapes.length === 0) {
          shapes = spTree.getElementsByTagName('sp');
        }
        if (shapes.length === 0) {
          const allSp = spTree.getElementsByTagName('*');
          shapes = [];
          for (let j = 0; j < allSp.length; j++) {
            if (allSp[j].localName === 'sp') shapes.push(allSp[j]);
          }
        }
        stats.shapes = shapes.length;
        
        // 统计图片
        let pics = spTree.getElementsByTagName('p:pic');
        if (pics.length === 0) {
          pics = spTree.getElementsByTagName('pic');
        }
        if (pics.length === 0) {
          const allPic = spTree.getElementsByTagName('*');
          pics = [];
          for (let j = 0; j < allPic.length; j++) {
            if (allPic[j].localName === 'pic') pics.push(allPic[j]);
          }
        }
        stats.pictures = pics.length;
        
        // 统计 graphicFrame（表格等）
        let graphicFrames = spTree.getElementsByTagName('p:graphicFrame');
        if (graphicFrames.length === 0) {
          graphicFrames = spTree.getElementsByTagName('graphicFrame');
        }
        if (graphicFrames.length === 0) {
          const allGf = spTree.getElementsByTagName('*');
          graphicFrames = [];
          for (let j = 0; j < allGf.length; j++) {
            if (allGf[j].localName === 'graphicFrame') graphicFrames.push(allGf[j]);
          }
        }
        stats.graphicFrames = graphicFrames.length;
        
        // 统计 group shapes
        let grpSps = spTree.getElementsByTagName('p:grpSp');
        if (grpSps.length === 0) {
          grpSps = spTree.getElementsByTagName('grpSp');
        }
        stats.groupShapes = grpSps.length;
        
        // 输出统计
        console.log(`  📊 元素统计:`);
        console.log(`     - 形状 (sp): ${stats.shapes}`);
        console.log(`     - 图片 (pic): ${stats.pictures}`);
        console.log(`     - 图形框 (graphicFrame): ${stats.graphicFrames}`);
        console.log(`     - 组合 (grpSp): ${stats.groupShapes}`);
        console.log(`     总计: ${stats.shapes + stats.pictures + stats.graphicFrames + stats.groupShapes}`);
        
        // 分析形状详情
        if (shapes.length > 0) {
          console.log(`\n  🔷 形状详情:`);
          
          for (let j = 0; j < Math.min(shapes.length, 5); j++) { // 只显示前5个
            const shape = shapes[j];
            
            // 获取位置和尺寸
            const spPr = shape.getElementsByTagName('p:spPr')[0] ||
                        shape.getElementsByTagName('spPr')[0];
            
            if (!spPr) {
              console.log(`     [${j + 1}] ⚠️  无 spPr`);
              continue;
            }
            
            const xfrm = spPr.getElementsByTagName('a:xfrm')[0] ||
                        spPr.getElementsByTagName('xfrm')[0];
            
            if (!xfrm) {
              console.log(`     [${j + 1}] ⚠️  无位置信息`);
              continue;
            }
            
            const off = xfrm.getElementsByTagName('a:off')[0] ||
                       xfrm.getElementsByTagName('off')[0];
            const ext = xfrm.getElementsByTagName('a:ext')[0] ||
                       xfrm.getElementsByTagName('ext')[0];
            
            const x = off ? parseInt(off.getAttribute('x') || '0') : 0;
            const y = off ? parseInt(off.getAttribute('y') || '0') : 0;
            const cx = ext ? parseInt(ext.getAttribute('cx') || '0') : 0;
            const cy = ext ? parseInt(ext.getAttribute('cy') || '0') : 0;
            
            // 检查是否有文本
            const txBody = shape.getElementsByTagName('p:txBody')[0] ||
                          shape.getElementsByTagName('txBody')[0];
            
            let text = '';
            if (txBody) {
              const tElements = txBody.getElementsByTagName('a:t');
              for (let k = 0; k < tElements.length; k++) {
                text += tElements[k].textContent || '';
              }
            }
            
            // 检查形状类型
            const prstGeom = spPr.getElementsByTagName('a:prstGeom')[0] ||
                            spPr.getElementsByTagName('prstGeom')[0];
            const shapeType = prstGeom ? prstGeom.getAttribute('prst') : 'rect';
            
            // 检查填充
            const hasSolidFill = spPr.getElementsByTagName('a:solidFill').length > 0 ||
                                spPr.getElementsByTagName('solidFill').length > 0;
            const hasGradFill = spPr.getElementsByTagName('a:gradFill').length > 0 ||
                               spPr.getElementsByTagName('gradFill').length > 0;
            const hasNoFill = spPr.getElementsByTagName('a:noFill').length > 0 ||
                             spPr.getElementsByTagName('noFill').length > 0;
            
            const fillType = hasNoFill ? 'none' : 
                           hasGradFill ? 'gradient' : 
                           hasSolidFill ? 'solid' : 'unknown';
            
            // 转换为像素
            const px = Math.round(x / 914400 * 96);
            const py = Math.round(y / 914400 * 96);
            const pcx = Math.round(cx / 914400 * 96);
            const pcy = Math.round(cy / 914400 * 96);
            
            console.log(`     [${j + 1}] ${shapeType}`);
            console.log(`         位置: (${px}, ${py}), 尺寸: ${pcx}x${pcy}`);
            console.log(`         填充: ${fillType}, 文本: ${text ? `"${text.substring(0, 30)}..."` : '无'}`);
          }
          
          if (shapes.length > 5) {
            console.log(`     ... 还有 ${shapes.length - 5} 个形状未显示`);
          }
        }
        
        console.log('\n========================================\n');
        
      } catch (error) {
        console.log(`  ❌ 解析失败: ${error.message}\n`);
      }
    }
    
    console.log('========================================');
    console.log('✓ 解析完成！');
    console.log('========================================\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行测试
testPPTXParsing();
