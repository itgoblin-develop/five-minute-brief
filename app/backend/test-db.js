// DB 연결 테스트 스크립트
const pool = require('./config/db');

async function testConnection() {
  try {
    console.log('🔍 DB 연결 테스트 중...');
    
    // 1. 연결 테스트
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ DB 연결 성공!');
    console.log('   현재 시간:', result.rows[0].current_time);
    
    // 2. Users 테이블 확인
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('✅ Users 테이블 존재 확인');
      
      // 3. 테이블 구조 확인
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);
      
      console.log('📋 Users 테이블 구조:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('❌ Users 테이블이 없습니다');
    }
    
    // 연결 종료
    await pool.end();
    console.log('✅ 테스트 완료!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ DB 연결 실패:', error.message);
    process.exit(1);
  }
}

testConnection();
