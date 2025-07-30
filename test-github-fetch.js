const { fetchGitHubFiles } = require('./lib/updater');

async function testGitHubFilesFetch() {
  try {
    console.log('Testing GitHub files fetch from boilerplate directory...');
    
    const files = await fetchGitHubFiles();
    
    console.log(`\nFetched ${files.length} GitHub files:`);
    files.forEach(file => {
      console.log(`- ${file.path} (${file.content.length} bytes)`);
    });
    
    if (files.length > 0) {
      console.log('\n✅ Successfully fetched GitHub files from boilerplate directory');
      console.log('\nFirst few lines of the first file:');
      console.log(files[0].content.substring(0, 200) + '...');
    } else {
      console.log('\n⚠️  No GitHub files found in boilerplate directory');
    }
    
  } catch (error) {
    console.error('❌ Error fetching GitHub files:', error.message);
  }
}

testGitHubFilesFetch();
