infra output arn {
  value = "${aws_dynamodb_table.basic-dynamodb-table.arn}"
}

infra output endpoint {
  value = "http://dynamodb.com:8080/endpoint/${aws_dynamodb_table.basic-dynamodb-table.arn}"
}

