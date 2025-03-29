// Test script for the posts Netlify function
const postsFunction = require('./posts');

async function testPostsFunction() {
  console.log('Testing posts function...');
  
  // Mock the Netlify function event for page 1
  const event = {
    httpMethod: 'GET',
    queryStringParameters: {
      page: '1'
    }
  };
  
  // Mock the Netlify function context
  const context = {};
  
  try {
    console.log('Testing page 1:');
    const response = await postsFunction.handler(event, context);
    console.log('Function returned status code:', response.statusCode);
    
    // Parse the response body
    const body = JSON.parse(response.body);
    console.log('Total posts:', body.totalPosts);
    console.log('Posts returned:', body.posts.length);
    console.log('Has more:', body.hasMore);
    
    // Print the first post as an example
    if (body.posts.length > 0) {
      console.log('\nExample post:');
      console.log('Title:', body.posts[0].title);
      console.log('Slug:', body.posts[0].slug);
      console.log('Date:', body.posts[0].date);
    }
    
    // Test page 2
    console.log('\nTesting page 2:');
    const event2 = {
      httpMethod: 'GET',
      queryStringParameters: {
        page: '2'
      }
    };
    
    const response2 = await postsFunction.handler(event2, context);
    console.log('Function returned status code:', response2.statusCode);
    
    // Parse the response body
    const body2 = JSON.parse(response2.body);
    console.log('Total posts:', body2.totalPosts);
    console.log('Posts returned:', body2.posts.length);
    console.log('Has more:', body2.hasMore);
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testPostsFunction(); 